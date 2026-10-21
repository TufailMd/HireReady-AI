const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createAIService,
  MODEL_ID,
  SDK_METHOD,
  API_VERSION,
  API_BASE_URL,
} = require("../src/services/ai.service");

const validReport = {
  matchScore: 78,
  technicalQuestions: [
    { question: "Question", intention: "Intent", answer: "Answer" },
  ],
  behavioralQuestions: [
    { question: "Question", intention: "Intent", answer: "Answer" },
  ],
  skillGaps: [{ skill: "Testing", severity: "medium" }],
  preparationPlan: [{ day: 1, focus: "Testing", tasks: ["Review tests"] }],
  title: "Frontend Engineer",
};

const createServiceWithResponse = (response, options = {}) => {
  const requests = [];
  const requestTimeouts = [];
  const service = createAIService({
    apiKey: "test-key",
    createClient: (key, timeout) => {
      assert.equal(key, "test-key");
      requestTimeouts.push(timeout);
      return {
      models: {
        generateContent: async (request) => {
          requests.push(request);
          const result =
            typeof response === "function" ? response(requests.length) : response;
          if (result instanceof Error) {
            throw result;
          }
          return result;
        },
      },
      };
    },
    sleep: async () => {},
    random: () => 0.5,
    ...options,
  });

  return { service, requests, requestTimeouts };
};

test("generates and validates a structured report with the documented Gemini model", async () => {
  const { service, requests } = createServiceWithResponse({
    text: JSON.stringify(validReport),
  });

  const report = await service.generateInterviewReport({
    resume: "Resume text",
    selfDescription: "",
    jobDescription: "Frontend Engineer",
  });

  assert.deepEqual(report, validReport);
  assert.equal(requests[0].model, MODEL_ID);
  assert.equal(MODEL_ID, "gemini-3.8-flash");
  assert.equal(SDK_METHOD, "models.generateContent");
  assert.equal(API_VERSION, "v1beta");
  assert.equal(API_BASE_URL, "https://generativelanguage.googleapis.com");
  assert.equal(requests[0].config.responseMimeType, "application/json");
  assert.ok(requests[0].config.responseJsonSchema);
  assert.equal(requests[0].config.responseSchema, undefined);
});

test("classifies provider authentication, model, availability, and quota failures", async (t) => {
  const cases = [
    [401, "AI_AUTHENTICATION_FAILED", 503],
    [403, "AI_PERMISSION_DENIED", 503],
    [404, "AI_MODEL_NOT_FOUND", 502],
    [503, "AI_PROVIDER_UNAVAILABLE", 503],
    [429, "AI_QUOTA_OR_RATE_LIMIT", 429],
  ];

  for (const [providerStatus, failureCode, httpStatus] of cases) {
    await t.test(`provider ${providerStatus}`, async () => {
      const { service, requests } = createServiceWithResponse(
        Object.assign(new Error("sensitive upstream message"), {
          status: providerStatus,
        }),
      );

      await assert.rejects(
        service.generateInterviewReport({
          resume: "",
          selfDescription: "Profile",
          jobDescription: "Role",
        }),
        (error) => {
          assert.equal(error.failureCode, failureCode);
          assert.equal(error.httpStatus, httpStatus);
          assert.equal(error.providerStatus, providerStatus);
          assert.ok(error.providerCode);
          assert.ok(error.providerMessage);
          assert.equal(error.publicMessage.includes("sensitive"), false);
          return true;
        },
      );
      assert.equal(requests.length, providerStatus === 404 || providerStatus < 429 ? 1 : 3);
    });
  }
});

test("classifies upstream timeouts separately", async () => {
  const timeout = Object.assign(new Error("request timed out"), {
    code: "ETIMEDOUT",
  });
  const { service, requests } = createServiceWithResponse(() => timeout);

  await assert.rejects(
    service.generateInterviewReport({
      resume: "",
      selfDescription: "Profile",
      jobDescription: "Role",
    }),
    (error) => {
      assert.equal(error.failureCode, "AI_UPSTREAM_TIMEOUT");
      assert.equal(error.httpStatus, 504);
      return true;
    },
  );
  assert.equal(requests.length, 3);
});

test("retries a transient 503 and succeeds without retrying a 404", async (t) => {
  await t.test("503 followed by successful structured output", async () => {
    const { service, requests } = createServiceWithResponse((attempt) =>
      attempt === 1
        ? Object.assign(new Error("temporary unavailable"), { status: 503 })
        : { text: JSON.stringify(validReport) },
    );

    const report = await service.generateInterviewReport({
      resume: "",
      selfDescription: "Profile",
      jobDescription: "Role",
    });

    assert.deepEqual(report, validReport);
    assert.equal(requests.length, 2);
  });

  await t.test("404 is not retried", async () => {
    const notFound = Object.assign(new Error("model not found"), { status: 404 });
    const { service, requests } = createServiceWithResponse(() => notFound);

    await assert.rejects(
      service.generateInterviewReport({
        resume: "",
        selfDescription: "Profile",
        jobDescription: "Role",
      }),
      (error) => error.failureCode === "AI_MODEL_NOT_FOUND",
    );
    assert.equal(requests.length, 1);
  });
});

test("enforces the total provider deadline across attempts", async () => {
  let currentTime = 0;
  const unavailable = Object.assign(new Error("unavailable"), { status: 503 });
  const { service, requests, requestTimeouts } = createServiceWithResponse(
    () => {
      currentTime += 12_000;
      return unavailable;
    },
    { now: () => currentTime },
  );

  await assert.rejects(
    service.generateInterviewReport({
      resume: "",
      selfDescription: "Profile",
      jobDescription: "Role",
    }),
    (error) => {
      assert.equal(error.failureCode, "AI_UPSTREAM_TIMEOUT");
      assert.equal(error.httpStatus, 504);
      return true;
    },
  );

  assert.equal(requests.length, 3);
  assert.ok(requestTimeouts[2] <= 3_000);
});

test("rejects malformed and schema-invalid model output", async (t) => {
  for (const text of ["not json", JSON.stringify({ title: "Incomplete" })]) {
    await t.test(text, async () => {
      const { service } = createServiceWithResponse({ text });

      await assert.rejects(
        service.generateInterviewReport({
          resume: "",
          selfDescription: "Profile",
          jobDescription: "Role",
        }),
        (error) => {
          assert.equal(error.failureCode, "AI_INVALID_RESPONSE");
          assert.equal(error.httpStatus, 502);
          assert.equal(error.providerCode, "INVALID_STRUCTURED_RESPONSE");
          return true;
        },
      );
    });
  }
});

test("does not call the provider when the configured key is absent", async () => {
  let called = false;
  const service = createAIService({
    apiKey: "",
    createClient: () => {
      called = true;
      throw new Error("client should not be created");
    },
  });

  await assert.rejects(
    service.generateInterviewReport({
      resume: "",
      selfDescription: "Profile",
      jobDescription: "Role",
    }),
    (error) => {
      assert.equal(error.failureCode, "AI_CONFIGURATION_MISSING");
      assert.equal(error.httpStatus, 503);
      return true;
    },
  );
  assert.equal(called, false);
});
