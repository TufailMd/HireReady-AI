const test = require("node:test");
const assert = require("node:assert/strict");
const { logRequestFailure } = require("../src/utils/requestDiagnostics");

test("logs correlated safe diagnostics without request or provider message content", () => {
  const originalError = console.error;
  let logged;
  console.error = (value) => {
    logged = value;
  };

  try {
    logRequestFailure(
      {
        requestId: "correlation-123",
        method: "POST",
        body: { resume: "private resume text" },
      },
      {
        stage: "ai_provider",
        status: 502,
        code: "AI_UPSTREAM_FAILURE",
        providerStatus: 400,
        providerCode: "INVALID_ARGUMENT",
        providerMessage: "Provider rejected the generation request.",
        modelId: "gemini-3.8-flash",
        sdkMethod: "models.generateContent",
        apiVersion: "v1beta",
        apiBaseUrl: "https://generativelanguage.googleapis.com",
      },
    );
  } finally {
    console.error = originalError;
  }

  const diagnostic = JSON.parse(logged);
  assert.equal(diagnostic.requestId, "correlation-123");
  assert.equal(diagnostic.stage, "ai_provider");
  assert.equal(diagnostic.status, 502);
  assert.equal(diagnostic.providerCode, "INVALID_ARGUMENT");
  assert.equal(diagnostic.providerMessage, "Provider rejected the generation request.");
  assert.equal(diagnostic.modelId, "gemini-3.8-flash");
  assert.equal(diagnostic.sdkMethod, "models.generateContent");
  assert.equal(diagnostic.apiVersion, "v1beta");
  assert.equal(diagnostic.apiBaseUrl, "https://generativelanguage.googleapis.com");
  assert.equal(JSON.stringify(diagnostic).includes("private resume text"), false);
});
