const express = require("express");
const authMiddleware = require("../middlewares/auth.middleware");
const interviewController = require("../controllers/interview.controller");
const upload = require("../middlewares/file.middleware");

const interviewRouter = express.Router();
const trackFailureStage = (stage) => (req, res, next) => {
  req.failureStage = stage;
  next();
};

interviewRouter.post(
  "/",
  authMiddleware.authUser,
  trackFailureStage("resume_upload"),
  upload.single("resume"),
  trackFailureStage("request_validation"),
  interviewController.generateInterViewReportController,
);
interviewRouter.get(
  "/report/:interviewId",
  authMiddleware.authUser,
  interviewController.getInterviewReportByIdController,
);
interviewRouter.get(
  "/",
  authMiddleware.authUser,
  interviewController.getAllInterviewReportsController,
);
interviewRouter.post(
  "/resume/pdf/:interviewReportId",
  authMiddleware.authUser,
  interviewController.generateResumePdfController,
);

module.exports = interviewRouter;
