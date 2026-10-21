const pdfParse = require("pdf-parse");
const {
  generateInterviewReport,
  generateResumePdf,
} = require("../services/ai.service");
const interviewReportModel = require("../models/interviewReport.model");

async function generateInterViewReportController(req, res) {
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
    const pdfHeader = Buffer.from("%PDF-");
    if (!req.file.buffer.subarray(0, 1024).includes(pdfHeader)) {
      return res.status(400).json({
        message: "The uploaded file is not a valid PDF resume.",
      });
    }

    try {
      const parsedResume = await new pdfParse.PDFParse(
        Uint8Array.from(req.file.buffer),
      ).getText();
      resume = parsedResume.text;
    } catch (error) {
      console.warn("Resume PDF parsing failed:", error.name);
      return res.status(400).json({
        message: "We couldn't read this PDF. Choose a valid, text-readable PDF.",
      });
    }
  }

  const interViewReportByAi = await generateInterviewReport({
    resume,
    selfDescription: normalizedSelfDescription,
    jobDescription: normalizedJobDescription,
  });

  const interviewReport = await interviewReportModel.create({
    user: req.user.id,
    resume,
    selfDescription: normalizedSelfDescription,
    jobDescription: normalizedJobDescription,
    ...interViewReportByAi,
  });

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
