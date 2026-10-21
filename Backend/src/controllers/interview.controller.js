const pdfParse = require("pdf-parse");
const {
  generateInterviewReport,
  generateResumePdf,
} = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");
const { logRequestFailure } = require("../utils/requestDiagnostics");

async function generateInterViewReportController(req, res, next) {
  req.failureStage = "request_validation";
  const { selfDescription, jobDescription } = req.body ?? {};

  if (
    typeof jobDescription !== "string" ||
    (selfDescription !== undefined && typeof selfDescription !== "string")
  ) {
    return res.status(400).json({
      message: "Job description and self-description must be text.",
    });
  }

  const normalizedJobDescription = jobDescription?.trim();
  const normalizedSelfDescription = selfDescription?.trim();

  if (
    !normalizedJobDescription ||
    normalizedJobDescription.length > 5000 ||
    (normalizedSelfDescription && normalizedSelfDescription.length > 5000)
  ) {
    return res.status(400).json({
      message: "Job and self descriptions must be at most 5000 characters.",
    });
  }

  if (!req.file && !normalizedSelfDescription) {
    return res.status(400).json({
      message: "Upload a PDF resume or provide a self-description.",
    });
  }

  let resume = "";
  if (req.file) {
    req.failureStage = "resume_validation";
    const pdfHeader = Buffer.from("%PDF-");
    if (!req.file.buffer.subarray(0, 1024).includes(pdfHeader)) {
      logRequestFailure(req, {
        stage: "resume_validation",
        status: 400,
        code: "INVALID_PDF_SIGNATURE",
      });
      return res.status(400).json({
        message: "The uploaded file is not a valid PDF resume.",
      });
    }

    try {
      req.failureStage = "resume_parsing";
      const parsedResume = await new pdfParse.PDFParse({
        data: Uint8Array.from(req.file.buffer),
      }).getText();
      resume = typeof parsedResume?.text === "string" ? parsedResume.text : "";
    } catch (error) {
      logRequestFailure(req, {
        stage: "resume_parsing",
        status: 400,
        code: "PDF_PARSE_FAILED",
      });
      return res.status(400).json({
        message: "We couldn't read this PDF. Choose a valid, text-readable PDF.",
      });
    }

    if (!resume.trim() && !normalizedSelfDescription) {
      logRequestFailure(req, {
        stage: "resume_parsing",
        status: 400,
        code: "PDF_CONTAINS_NO_TEXT",
      });
      return res.status(400).json({
        message: "We couldn't find readable text in this PDF. Choose a text-readable PDF or provide a self-description.",
      });
    }
  }

  req.failureStage = "ai_provider";
  let interViewReportByAi;
  try {
    interViewReportByAi = await generateInterviewReport({
      resume,
      selfDescription: normalizedSelfDescription,
      jobDescription: normalizedJobDescription,
    });
  } catch (error) {
    return next(error);
  }

  req.failureStage = "report_persistence";
  let interviewReport;
  try {
    interviewReport = await interviewReportModel.create({
      user: req.user.id,
      resume,
      selfDescription: normalizedSelfDescription,
      jobDescription: normalizedJobDescription,
      ...interViewReportByAi,
    });
  } catch (cause) {
    const isDatabaseUnavailable = [
      "MongoNetworkError",
      "MongoServerSelectionError",
      "MongoTimeoutError",
    ].includes(cause.name);
    const error = new Error(
      isDatabaseUnavailable ? "Report database is unavailable." : "Report could not be saved.",
    );
    error.stage = "report_persistence";
    error.failureCode = isDatabaseUnavailable
      ? "REPORT_DATABASE_UNAVAILABLE"
      : "REPORT_PERSISTENCE_FAILED";
    error.httpStatus = isDatabaseUnavailable ? 503 : 500;
    error.publicMessage = isDatabaseUnavailable
      ? "Your plan was generated but couldn't be saved. Please try again later."
      : "Your plan couldn't be saved. Please try again.";
    error.cause = cause;
    return next(error);
  }

  req.failureStage = "complete";
  res.status(201).json({
    message: "Interview report generated successfully.",
    interviewReport,
  });
}

async function getInterviewReportByIdController(req, res) {
  const { interviewId } = req.params;

  const interviewReport = await interviewReportModel.findOne({
    _id: interviewId,
    user: req.user.id,
  });

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found.",
    });
  }

  res.status(200).json({
    message: "Interview report fetched successfully.",
    interviewReport,
  });
}

async function getAllInterviewReportsController(req, res) {
  const interviewReports = await interviewReportModel
    .find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .select(
      "-resume -selfDescription -jobDescription -__v -technicalQuestions -behavioralQuestions -skillGaps -preparationPlan",
    );

  res.status(200).json({
    message: "Interview reports fetched successfully.",
    interviewReports,
  });
}

async function generateResumePdfController(req, res) {
  const { interviewReportId } = req.params;

  const interviewReport = await interviewReportModel.findOne({
    _id: interviewReportId,
    user: req.user.id,
  });

  if (!interviewReport) {
    return res.status(404).json({
      message: "Interview report not found.",
    });
  }

  const { resume, jobDescription, selfDescription } = interviewReport;

  const pdfBuffer = await generateResumePdf({
    resume,
    jobDescription,
    selfDescription,
  });

  res.set({
    "Content-Type": "application/pdf",
    "Content-Disposition": `attachment; filename=resume_${interviewReportId}.pdf`,
  });

  res.send(pdfBuffer);
}

module.exports = {
  generateInterViewReportController,
  getInterviewReportByIdController,
  getAllInterviewReportsController,
  generateResumePdfController,
};
