const { GoogleGenAI } = require("@google/genai");
const { z } = require("zod");
const { zodToJsonSchema } = require("zod-to-json-schema");
const puppeteer = require("puppeteer");

const MODEL_ID = "gemini-3.8-flash";
const SDK_METHOD = "models.generateContent";
const API_VERSION = "v1beta";
const API_BASE_URL = "https://generativelanguage.googleapis.com";
const AI_TOTAL_TIMEOUT_MS = 27_000;
const AI_ATTEMPT_TIMEOUT_MS = 15_000;
const AI_MAX_ATTEMPTS = 3;
const AI_RETRY_INITIAL_DELAY_MS = 250;
const AI_RETRY_MAX_DELAY_MS = 2_000;

const interviewReportSchema = z.object({
  matchScore: z
    .number()
    .describe(
      "A score between 0 and 100 indicating how well the candidate's profile matches the job describe",
    ),
  technicalQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The technical question can be asked in the interview"),
        intention: z
          .string()
          .describe("The intention of interviewer behind asking this question"),
        answer: z
          .string()
          .describe(
            "How to answer this question, what points to cover, what approach to take etc.",
          ),
      }),
    )
    .describe(
      "Technical questions that can be asked in the interview along with their intention and how to answer them",
    ),
  behavioralQuestions: z
    .array(
      z.object({
        question: z
          .string()
          .describe("The technical question can be asked in the interview"),
        intention: z
          .string()
          .describe("The intention of interviewer behind asking this question"),
        answer: z
          .string()
          .describe(
            "How to answer this question, what points to cover, what approach to take etc.",
          ),
      }),
    )
    .describe(
      "Behavioral questions that can be asked in the interview along with their intention and how to answer them",
    ),
  skillGaps: z
    .array(
      z.object({
        skill: z.string().describe("The skill which the candidate is lacking"),
        severity: z
          .enum(["low", "medium", "high"])
          .describe(
            "The severity of this skill gap, i.e. how important is this skill for the job and how much it can impact the candidate's chances",
          ),
      }),
    )
    .describe(
      "List of skill gaps in the candidate's profile along with their severity",
    ),
  preparationPlan: z
    .array(
      z.object({
        day: z
          .number()
          .describe("The day number in the preparation plan, starting from 1"),
        focus: z
          .string()
          .describe(
            "The main focus of this day in the preparation plan, e.g. data structures, system design, mock interviews etc.",
          ),
        tasks: z
          .array(z.string())
          .describe(
            "List of tasks to be done on this day to follow the preparation plan, e.g. read a specific book or article, solve a set of problems, watch a video etc.",
          ),
      }),
    )
    .describe(
      "A day-wise preparation plan for the candidate to follow in order to prepare for the interview effectively",
    ),
  title: z
    .string()
    .describe(
      "The title of the job for which the interview report is generated",
    ),
});

const toGeminiJsonSchema = (schema) => {
  const { $schema, ...apiSchema } = zodToJsonSchema(schema);
  return apiSchema;
};

const safeProviderCode = (cause, status) => {
  const candidate =
    cause?.error?.status ??
    cause?.response?.data?.error?.status ??
    cause?.code;
  if (typeof candidate === "string" && /^[A-Z0-9_]{1,64}$/.test(candidate)) {
    return candidate;
  }

  return (
    {
      400: "INVALID_ARGUMENT",
      401: "UNAUTHENTICATED",
      403: "PERMISSION_DENIED",
      404: "NOT_FOUND",
      408: "DEADLINE_EXCEEDED",
      429: "RESOURCE_EXHAUSTED",
      500: "INTERNAL",
      503: "UNAVAILABLE",
      504: "DEADLINE_EXCEEDED",
    }[status] || "UPSTREAM_ERROR"
  );
};

const createAIServiceError = ({
  stage,
  failureCode,
  httpStatus,
  providerStatus,
  providerCode,
  providerMessage,
  publicMessage,
  cause,
}) => {
  const error = new Error(failureCode);
  error.stage = stage;
  error.failureCode = failureCode;
  error.httpStatus = httpStatus;
  error.providerStatus = providerStatus;
  error.providerCode = providerCode;
  error.providerMessage = providerMessage;
  error.modelId = MODEL_ID;
  error.sdkMethod = SDK_METHOD;
  error.apiVersion = API_VERSION;
  error.apiBaseUrl = API_BASE_URL;
  error.publicMessage = publicMessage;
  error.cause = cause;
  return error;
};

const safeProviderMessage = (status) =>
  ({
    400: "Provider rejected the generation request.",
    401: "Provider authentication failed.",
    403: "Provider denied access to the model.",
    404: "Provider could not find the requested model or API resource.",
    408: "Provider request timed out.",
    429: "Provider rate limit or quota was reached.",
    500: "Provider returned an internal error.",
    503: "Provider is temporarily unavailable.",
    504: "Provider request timed out.",
  })[status] || "Provider request failed.";

const classifyProviderError = (cause) => {
  const providerStatus = Number(cause?.status ?? cause?.statusCode);
  const providerCode = safeProviderCode(cause, providerStatus);
  const normalizedProviderStatus = Number.isFinite(providerStatus)
    ? providerStatus
    : undefined;
  const providerMessage = safeProviderMessage(normalizedProviderStatus);

  if (providerStatus === 401) {
    return createAIServiceError({
      stage: "ai_provider",
      failureCode: "AI_AUTHENTICATION_FAILED",
      httpStatus: 503,
      providerStatus,
      providerCode,
      providerMessage,
      publicMessage: "Interview plan generation is temporarily unavailable.",
      cause,
    });
  }

  if (providerStatus === 403) {
    return createAIServiceError({
      stage: "ai_provider",
      failureCode: "AI_PERMISSION_DENIED",
      httpStatus: 503,
      providerStatus,
      providerCode,
      providerMessage,
      publicMessage: "Interview plan generation is temporarily unavailable.",
      cause,
    });
  }

  if (providerStatus === 404) {
    return createAIServiceError({
      stage: "ai_provider",
      failureCode: "AI_MODEL_NOT_FOUND",
      httpStatus: 502,
      providerStatus,
      providerCode,
      providerMessage,
      publicMessage: "The interview plan service is misconfigured. Please try again later.",
      cause,
    });
  }

  if (providerStatus === 429) {
    return createAIServiceError({
      stage: "ai_provider",
      failureCode: "AI_QUOTA_OR_RATE_LIMIT",
      httpStatus: 429,
      providerStatus,
      providerCode,
      providerMessage,
      publicMessage: "The interview plan service is busy. Please wait a moment and try again.",
      cause,
    });
  }

  if (
    providerStatus === 408 ||
    providerStatus === 504 ||
    ["ETIMEDOUT", "ECONNABORTED", "UND_ERR_CONNECT_TIMEOUT"].includes(
      cause?.code,
    ) ||
    ["TimeoutError", "AbortError"].includes(cause?.name)
  ) {
    return createAIServiceError({
      stage: "ai_provider",
      failureCode: "AI_UPSTREAM_TIMEOUT",
      httpStatus: 504,
      providerStatus: normalizedProviderStatus,
      providerCode,
      providerMessage,
      publicMessage: "Interview plan generation took too long. Please try again.",
      cause,
    });
  }

  if (providerStatus === 400) {
    return createAIServiceError({
      stage: "ai_provider",
      failureCode: "AI_REQUEST_REJECTED",
      httpStatus: 502,
      providerStatus,
      providerCode,
      providerMessage,
      publicMessage: "The interview plan request could not be processed. Please try again.",
      cause,
    });
  }

  if (providerStatus === 503) {
    return createAIServiceError({
      stage: "ai_provider",
      failureCode: "AI_PROVIDER_UNAVAILABLE",
      httpStatus: 503,
      providerStatus,
      providerCode,
      providerMessage,
      publicMessage:
        "The interview plan service is temporarily busy. Please try again shortly.",
      cause,
    });
  }

  return createAIServiceError({
    stage: "ai_provider",
    failureCode: "AI_UPSTREAM_FAILURE",
    httpStatus: 502,
    providerStatus: normalizedProviderStatus,
    providerCode,
    providerMessage,
    publicMessage: "The interview plan service is temporarily unavailable. Please try again shortly.",
    cause,
  });
};

const createAIService = ({
  apiKey = process.env.GOOGLE_GENAI_API_KEY,
  createClient = (key, timeout) =>
    new GoogleGenAI({
      apiKey: key,
      httpOptions: {
        baseUrl: API_BASE_URL,
        apiVersion: API_VERSION,
        timeout,
        retryOptions: { attempts: 1 },
      },
    }),
  sleep = (milliseconds) =>
    new Promise((resolve) => setTimeout(resolve, milliseconds)),
  random = Math.random,
  now = Date.now,
} = {}) => {
  const getClient = (timeout = AI_ATTEMPT_TIMEOUT_MS) => {
    if (!apiKey) {
      throw createAIServiceError({
        stage: "ai_configuration",
        failureCode: "AI_CONFIGURATION_MISSING",
        httpStatus: 503,
        publicMessage:
          "Interview plan generation is not configured. Please try again later.",
      });
    }

    return createClient(apiKey, timeout);
  };

  const generateWithRetry = async (request) => {
    const deadline = now() + AI_TOTAL_TIMEOUT_MS;
    let lastError;

    for (let attempt = 1; attempt <= AI_MAX_ATTEMPTS; attempt += 1) {
      const remainingMs = deadline - now();
      if (remainingMs <= 0) {
        break;
      }

      try {
        return await getClient(
          Math.min(AI_ATTEMPT_TIMEOUT_MS, remainingMs),
        ).models.generateContent(request);
      } catch (cause) {
        if (cause?.failureCode) {
          throw cause;
        }

        lastError = classifyProviderError(cause);
        if (now() >= deadline) {
          throw classifyProviderError(
            Object.assign(
              new Error("Provider request exceeded the total timeout."),
              { name: "TimeoutError", code: "ETIMEDOUT" },
            ),
          );
        }
        const retryable =
          lastError.failureCode === "AI_PROVIDER_UNAVAILABLE" ||
          lastError.failureCode === "AI_QUOTA_OR_RATE_LIMIT" ||
          lastError.failureCode === "AI_UPSTREAM_TIMEOUT";
        if (!retryable || attempt === AI_MAX_ATTEMPTS) {
          throw lastError;
        }

        const delayCeiling = Math.min(
          AI_RETRY_MAX_DELAY_MS,
          AI_RETRY_INITIAL_DELAY_MS * 2 ** (attempt - 1),
        );
        const delayMs = Math.min(
          AI_RETRY_MAX_DELAY_MS,
          delayCeiling * (0.5 + random()),
        );
        const delayBudget = deadline - now();
        if (delayBudget <= 0) {
          break;
        }
        await sleep(Math.min(delayMs, delayBudget));
      }
    }

    if (lastError?.failureCode === "AI_UPSTREAM_TIMEOUT") {
      throw lastError;
    }

    throw classifyProviderError(
      Object.assign(new Error("Provider request exceeded the total timeout."), {
        name: "TimeoutError",
        code: "ETIMEDOUT",
      }),
    );
  };

  const generateInterviewReport = async ({
    resume,
    selfDescription,
    jobDescription,
  }) => {
    const prompt = `Generate an interview report for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}
`;

    const response = await generateWithRetry({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: toGeminiJsonSchema(interviewReportSchema),
      },
    });

    try {
      if (typeof response?.text !== "string" || response.text.length === 0) {
        throw new Error("Empty structured response");
      }
      return interviewReportSchema.parse(JSON.parse(response.text));
    } catch (cause) {
      throw createAIServiceError({
        stage: "ai_response_validation",
        failureCode: "AI_INVALID_RESPONSE",
        httpStatus: 502,
        providerCode: "INVALID_STRUCTURED_RESPONSE",
        publicMessage:
          "The interview plan service returned an invalid response. Please try again.",
        cause,
      });
    }
  };

  const generateResumePdf = async ({ resume, selfDescription, jobDescription }) => {
    const resumePdfSchema = z.object({
      html: z.string(),
    });
    const prompt = `Generate resume for a candidate with the following details:
                        Resume: ${resume}
                        Self Description: ${selfDescription}
                        Job Description: ${jobDescription}

                        Return a JSON object with a single field "html" containing a simple, professional, ATS-friendly resume that can be converted to PDF.
                    `;
    const response = await getClient().models.generateContent({
      model: MODEL_ID,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: toGeminiJsonSchema(resumePdfSchema),
      },
    });
    const jsonContent = resumePdfSchema.parse(JSON.parse(response.text));
    return generatePdfFromHtml(jsonContent.html);
  };

  return { generateInterviewReport, generateResumePdf };
};

const aiService = createAIService();

async function generatePdfFromHtml(htmlContent) {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.setContent(htmlContent, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    margin: {
      top: "20mm",
      bottom: "20mm",
      left: "15mm",
      right: "15mm",
    },
  });

  await browser.close();

  return pdfBuffer;
}

module.exports = {
  ...aiService,
  createAIService,
  classifyProviderError,
  MODEL_ID,
  SDK_METHOD,
  API_VERSION,
  API_BASE_URL,
};
