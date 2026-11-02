import {
  getAllInterviewReports,
  generateInterviewReport,
  getInterviewReportById,
  generateResumePdf,
} from "../services/interview.api";
import { useCallback, useContext, useEffect, useState } from "react";
import { InterviewContext } from "../context/interview.context";
import { useParams } from "react-router";

export const useInterview = () => {
  const context = useContext(InterviewContext);
  const { interviewId } = useParams();
  const [error, setError] = useState(null);

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
    reportsLoaded,
    setReportsLoaded,
  } = context;

  const generateReport = async ({
    jobDescription,
    selfDescription,
    resumeFile,
  }) => {
    setLoading(true);
    let response = null;
    try {
      response = await generateInterviewReport({
        jobDescription,
        selfDescription,
        resumeFile,
      });
      setReport(response.interviewReport);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }

    return response.interviewReport;
  };

  const getReportById = useCallback(async (interviewId) => {
    setLoading(true);
    let response = null;
    try {
      response = await getInterviewReportById(interviewId);
      setReport(response.interviewReport);
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
    return response.interviewReport;
  }, [setLoading, setReport]);

  const getReports = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await getAllInterviewReports();
      if (!Array.isArray(response.interviewReports)) {
        throw new Error("The interview plans response was invalid.");
      }
      setReports(response.interviewReports);
      return response.interviewReports;
    } catch (error) {
      console.error("Failed to load interview plans", error);
      setError(error);
      return null;
    } finally {
      setLoading(false);
      setReportsLoaded(true);
    }
  }, [setLoading, setReports, setReportsLoaded]);

  const getResumePdf = async (interviewReportId) => {
    setLoading(true);
    let response = null;
    try {
      response = await generateResumePdf({ interviewReportId });
      const url = window.URL.createObjectURL(
        new Blob([response], { type: "application/pdf" }),
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `resume_${interviewReportId}.pdf`);
      document.body.appendChild(link);
      link.click();
    } catch (error) {
      console.log(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (interviewId) {
      getReportById(interviewId);
    } else {
      getReports();
    }
  }, [interviewId, getReportById, getReports]);

  return {
    loading,
    error,
    report,
    reports,
    reportsLoaded,
    generateReport,
    getReportById,
    getReports,
    getResumePdf,
  };
};
