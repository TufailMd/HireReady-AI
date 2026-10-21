const express = require("express");
const cookieParser = require("cookie-parser");
const cors = require("cors");

const app = express();

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
    return res.status(413).json({ message: "Resume files must be at most 3MB." });
  }

  if (err.message === "Only PDF resumes are supported.") {
    return res.status(400).json({
      message: "Choose a PDF resume no larger than 3MB.",
    });
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "Invalid request body." });
  }

  if (err.status === 413 || err.statusCode === 413) {
    return res.status(413).json({ message: "Request body is too large." });
  }

  if (err.publicMessage) {
    console.error("Interview generation failed:", {
      code: err.code || "AI_PROVIDER_FAILURE",
      upstreamStatus: err.upstreamStatus,
    });
    return res.status(err.status || 502).json({ message: err.publicMessage });
  }

  console.error("Request failed:", {
    method: req.method,
    path: req.path,
    name: err.name,
    code: err.code,
  });
  return res.status(500).json({ message: "An unexpected server error occurred." });
});

module.exports = app;
