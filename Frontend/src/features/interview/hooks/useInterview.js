import { useCallback, useContext, useEffect, useRef } from "react";
import { InterviewContext } from "../interview.context";
import { useParams } from "react-router";

import {
  getAllInterviewReports,
  generateInterviewReport,
  getInterviewReportById,
  generateResumePdf,
} from "../services/interview.api";

const isValidInterviewReport = (report) =>
  report &&
  typeof report._id === "string" &&
  typeof report.title === "string" &&
  Number.isFinite(report.matchScore) &&
  report.matchScore >= 0 &&
  report.matchScore <= 100 &&
  Array.isArray(report.technicalQuestions) &&
  report.technicalQuestions.every(
    (question) =>
      question &&
      typeof question.question === "string" &&
      typeof question.intention === "string" &&
      typeof question.answer === "string",
  ) &&
  Array.isArray(report.behavioralQuestions) &&
  report.behavioralQuestions.every(
    (question) =>
      question &&
      typeof question.question === "string" &&
      typeof question.intention === "string" &&
      typeof question.answer === "string",
  ) &&
  Array.isArray(report.preparationPlan) &&
  report.preparationPlan.every(
    (day) =>
      day &&
      Number.isFinite(day.day) &&
      typeof day.focus === "string" &&
      Array.isArray(day.tasks) &&
      day.tasks.every((task) => typeof task === "string"),
  ) &&
  Array.isArray(report.skillGaps) &&
  report.skillGaps.every(
    (gap) =>
      gap &&
      typeof gap.skill === "string" &&
      ["low", "medium", "high"].includes(gap.severity),
  );

export const useInterview = () => {
  const context = useContext(InterviewContext);
  const { interviewId } = useParams();
  const reportRequestId = useRef(0);

  if (!context) {
    throw new Error("useInterview must be used within an InterviewProvider");
  }

  const {
    loading,
    setLoading,
    report,
    setReport,
    reports,
    setReports,
    error,
    setError,
    reportStatus,
    setReportStatus,
  } = context;

  // Generate interview report
  const generateReport = async ({
    jobDescription,
    selfDescription,
    resumeFile,
  }) => {
    setLoading(true);
    setError(null);
    setReportStatus("loading");

    try {
      const response = await generateInterviewReport({
        jobDescription,
        selfDescription,
        resumeFile,
      });

      const newReport = response?.interviewReport;

      if (!newReport?._id) {
        throw new Error("Interview report was not returned by the server");
      }

      setReport(newReport);
      setReportStatus("success");

      return newReport;
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to generate interview report";

      setError(message);
      setReportStatus("error");

      console.error("Generate report failed:", message);

      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get a single report
  const getReportById = useCallback(async (id) => {
    const requestId = ++reportRequestId.current;

    if (!id) {
      setError("Interview report ID is missing");
      setReportStatus("error");
      return null;
    }

    setLoading(true);
    setError(null);
    setReport(null);
    setReportStatus("loading");

    try {
      const response = await getInterviewReportById(id);
      const interviewReport = response?.interviewReport;

      if (!isValidInterviewReport(interviewReport)) {
        throw new Error("Interview report is incomplete or malformed");
      }

      if (requestId === reportRequestId.current) {
        setReport(interviewReport);
        setReportStatus("success");
      }

      return interviewReport;
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to load interview report";

      if (requestId === reportRequestId.current) {
        setReport(null);
        setError(message);
        setReportStatus("error");
      }

      console.error("Get report failed:", message);

      return null;
    } finally {
      if (requestId === reportRequestId.current) {
        setLoading(false);
      }
    }
  }, [setError, setLoading, setReport, setReportStatus]);

  // Get all reports
  const getReports = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAllInterviewReports();
      const interviewReports = response?.interviewReports;

      if (
        !Array.isArray(interviewReports) ||
        !interviewReports.every(
          (item) =>
            item &&
            typeof item._id === "string" &&
            typeof item.title === "string" &&
            Number.isFinite(item.matchScore) &&
            Number.isFinite(Date.parse(item.createdAt)),
        )
      ) {
        throw new Error("Interview reports are incomplete or malformed");
      }

      setReports(interviewReports);

      return interviewReports;
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to load interview reports";

      setReports([]);
      setError(message);

      console.error("Get reports failed:", message);

      return [];
    } finally {
      setLoading(false);
    }
  }, [setError, setLoading, setReports]);

  // Download resume PDF
  const getResumePdf = async (interviewReportId) => {
    setError(null);
    let url;
    let link;

    try {
      if (!interviewReportId) {
        throw new Error("Interview report ID is missing");
      }

      const response = await generateResumePdf({
        interviewReportId,
      });

      url = window.URL.createObjectURL(
        new Blob([response], { type: "application/pdf" }),
      );

      link = document.createElement("a");
      link.href = url;
      link.download = `resume_${interviewReportId}.pdf`;

      document.body.appendChild(link);
      link.click();
      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
      return true;
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to download resume PDF";
      setError(message);
      console.error("Download resume failed:", message);
      if (url) {
        window.URL.revokeObjectURL(url);
      }
      return false;
    } finally {
      link?.remove();
    }
  };

  // Load report for detail page, otherwise load report list
  useEffect(() => {
    if (interviewId) {
      getReportById(interviewId);
    } else {
      reportRequestId.current += 1;
      setReport(null);
      setError(null);
      setReportStatus("idle");
      void getReports();
    }
    return () => {
      reportRequestId.current += 1;
    };
  }, [getReportById, getReports, interviewId, setError, setReport, setReportStatus]);

  return {
    loading,
    report,
    reports,
    error,
    reportStatus,
    generateReport,
    getReportById,
    getReports,
    getResumePdf,
  };
};
