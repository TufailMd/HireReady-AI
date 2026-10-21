import { useContext, useEffect } from "react";
import { InterviewContext } from "../interview.context";
import { useParams } from "react-router";

import {
  getAllInterviewReports,
  generateInterviewReport,
  getInterviewReportById,
  generateResumePdf,
} from "../services/interview.api";

export const useInterview = () => {
  const context = useContext(InterviewContext);
  const { interviewId } = useParams();

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
  const getReportById = async (id) => {
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

      if (!interviewReport) {
        throw new Error("Interview report not found");
      }

      setReport(interviewReport);
      setReportStatus("success");

      return interviewReport;
    } catch (err) {
      const message =
        err.response?.data?.message ||
        err.message ||
        "Failed to load interview report";

      setReport(null);
      setError(message);
      setReportStatus("error");

      console.error("Get report failed:", message);

      return null;
    } finally {
      setLoading(false);
    }
  };

  // Get all reports
  const getReports = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await getAllInterviewReports();
      const interviewReports = response?.interviewReports ?? [];

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
  };

  // Download resume PDF
  const getResumePdf = async (interviewReportId) => {
    setLoading(true);

    try {
      const response = await generateResumePdf({
        interviewReportId,
      });

      const url = window.URL.createObjectURL(
        new Blob([response], { type: "application/pdf" }),
      );

      const link = document.createElement("a");
      link.href = url;
      link.download = `resume_${interviewReportId}.pdf`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      // Revoke after the browser has started the download
      window.setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (err) {
      console.error(
        "Download resume failed:",
        err.response?.data || err.message,
      );
    } finally {
      setLoading(false);
    }
  };

  // Load report for detail page, otherwise load report list
  useEffect(() => {
    if (interviewId) {
      getReportById(interviewId);
    } else {
      setReport(null);
      setReportStatus("idle");
      getReports();
    }
  }, [interviewId]);

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
