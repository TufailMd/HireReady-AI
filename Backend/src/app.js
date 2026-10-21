const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const { randomUUID } = require("node:crypto");
const { logRequestFailure } = require("./utils/requestDiagnostics");

const app = express();

app.use((req, res, next) => {
  req.requestId = randomUUID();
  req.failureStage = "request";
  res.setHeader("X-Request-Id", req.requestId);
  next();
});

app.use(express.json());
app.use(cookieParser());
const allowedOrigins = [
  "http://localhost:5173",
  "https://hireready-ai-1-ouci.onrender.com",
];

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
    exposedHeaders: ["X-Request-Id"],
  }),
);

const authRouter = require("./routes/auth.routes");
const interviewRouter = require("./routes/interview.routes");

app.use("/api/auth", authRouter);
app.use("/api/interview", interviewRouter);

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.code === "LIMIT_FILE_SIZE") {
    logRequestFailure(req, {
      stage: req.failureStage || "upload",
      status: 413,
      code: "UPLOAD_TOO_LARGE",
    });
    return res.status(413).json({ message: "Resume files must be at most 3MB." });
  }

  if (err.message === "Only PDF resumes are supported.") {
    logRequestFailure(req, {
      stage: req.failureStage || "upload",
      status: 400,
      code: "UNSUPPORTED_FILE_TYPE",
    });
    return res.status(400).json({
      message: "Choose a PDF resume no larger than 3MB.",
    });
  }

  if (err.type === "entity.parse.failed") {
    logRequestFailure(req, {
      stage: "request_body",
      status: 400,
      code: "INVALID_REQUEST_BODY",
    });
    return res.status(400).json({ message: "Invalid request body." });
  }

  if (err.status === 413 || err.statusCode === 413) {
    logRequestFailure(req, {
      stage: req.failureStage || "request_body",
      status: 413,
      code: "REQUEST_TOO_LARGE",
    });
    return res.status(413).json({ message: "Request body is too large." });
  }

  if (err.publicMessage) {
    logRequestFailure(req, {
      stage: err.stage || req.failureStage || "unknown",
      status: err.httpStatus || err.status || 502,
      code: err.failureCode || err.code || "UPSTREAM_FAILURE",
      providerStatus: err.providerStatus,
      providerCode: err.providerCode,
      providerMessage: err.providerMessage,
      modelId: err.modelId,
      sdkMethod: err.sdkMethod,
      apiVersion: err.apiVersion,
      apiBaseUrl: err.apiBaseUrl,
    });
    return res.status(err.httpStatus || err.status || 502).json({
      message: err.publicMessage,
    });
  }

  const status = err.status || err.statusCode || 500;
  logRequestFailure(req, {
    stage: req.failureStage || "unknown",
    status: status >= 400 && status < 600 ? status : 500,
    code: err.code || err.name || "INTERNAL_ERROR",
  });
  return res.status(status >= 400 && status < 600 ? status : 500).json({
    message:
      status === 503
        ? "The service is temporarily unavailable. Please try again."
        : "An unexpected server error occurred.",
  });
});

module.exports = app;
