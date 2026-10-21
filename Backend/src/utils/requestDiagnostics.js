function logRequestFailure(req, {
  stage,
  status,
  code,
  providerStatus,
  providerCode,
  providerMessage,
  modelId,
  sdkMethod,
  apiVersion,
  apiBaseUrl,
}) {
  console.error(
    JSON.stringify({
      event: "request_failure",
      requestId: req.requestId || "unavailable",
      method: req.method,
      stage,
      status,
      code,
      ...(Number.isInteger(providerStatus) ? { providerStatus } : {}),
      ...(providerCode ? { providerCode } : {}),
      ...(providerMessage ? { providerMessage } : {}),
      ...(modelId ? { modelId } : {}),
      ...(sdkMethod ? { sdkMethod } : {}),
      ...(apiVersion ? { apiVersion } : {}),
      ...(apiBaseUrl ? { apiBaseUrl } : {}),
    }),
  );
}

module.exports = { logRequestFailure };
