import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes } from "react-router";
import { InterviewProvider } from "../interview.context";
import {
  generateInterviewReport,
  generateResumePdf,
  getAllInterviewReports,
  getInterviewReportById,
} from "../services/interview.api";
import { useInterview } from "./useInterview";

vi.mock("../services/interview.api", () => ({
  generateInterviewReport: vi.fn(),
  generateResumePdf: vi.fn(),
  getAllInterviewReports: vi.fn(),
  getInterviewReportById: vi.fn(),
}));

const validReport = {
  _id: "report-1",
  title: "Frontend Engineer",
  matchScore: 82,
  technicalQuestions: [],
  behavioralQuestions: [],
  preparationPlan: [],
  skillGaps: [],
};

const InterviewProbe = () => {
  const {
    report,
    reportStatus,
    error,
    getReportById,
    getResumePdf,
    generateReport,
  } = useInterview();

  return (
    <>
      <output data-testid="status">{reportStatus}</output>
      <output data-testid="report-id">{report?._id || "none"}</output>
      <output data-testid="error">{error || ""}</output>
      <button onClick={() => generateReport({
        jobDescription: "Role",
        selfDescription: "",
        resumeFile: null,
      })}>Generate test report</button>
      <button onClick={() => getReportById("report-1")}>Retry report</button>
      <button onClick={() => getResumePdf("report-1")}>Download PDF</button>
    </>
  );
};

const renderInterview = () =>
  render(
    <MemoryRouter initialEntries={["/interview/report-1"]}>
      <InterviewProvider>
        <Routes>
          <Route
            path="/interview/:interviewId"
            element={<InterviewProbe />}
          />
        </Routes>
      </InterviewProvider>
    </MemoryRouter>,
  );

describe("useInterview", () => {
  beforeEach(() => {
    generateInterviewReport.mockResolvedValue({ interviewReport: validReport });
    getAllInterviewReports.mockResolvedValue({ interviewReports: [] });
    getInterviewReportById.mockResolvedValue({ interviewReport: validReport });
    generateResumePdf.mockResolvedValue(new Blob(["pdf"]));
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("loads a report using the status setter provided by InterviewContext", async () => {
    renderInterview();

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("success");
    });

    expect(screen.getByTestId("report-id").textContent).toBe("report-1");
  });

  it("shows an error instead of rendering malformed report data", async () => {
    getInterviewReportById.mockResolvedValue({
      interviewReport: { ...validReport, technicalQuestions: null },
    });

    renderInterview();

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("error");
    });

    expect(screen.getByTestId("report-id").textContent).toBe("none");
    expect(screen.getByTestId("error").textContent).toMatch(/malformed/i);
  });

  it("shows a retrieval error and recovers when the user retries", async () => {
    getInterviewReportById
      .mockRejectedValueOnce({
        response: { status: 401, data: { message: "Session expired" } },
      })
      .mockResolvedValueOnce({ interviewReport: validReport });

    renderInterview();

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("error");
    });
    expect(screen.getByTestId("error").textContent).toMatch(/session has expired/i);

    fireEvent.click(screen.getByRole("button", { name: "Retry report" }));

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("success");
    });
    expect(screen.getByTestId("report-id").textContent).toBe("report-1");
  });

  it("keeps report status successful when PDF generation fails", async () => {
    generateResumePdf.mockRejectedValue(new Error("PDF generation failed"));
    renderInterview();

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("success");
    });

    fireEvent.click(screen.getByRole("button", { name: "Download PDF" }));

    await waitFor(() => {
      expect(screen.getByTestId("error").textContent).toBe(
        "PDF generation failed",
      );
    });

    expect(screen.getByTestId("status").textContent).toBe("success");
  });

  it("shows a retryable rate-limit error from report generation", async () => {
    generateInterviewReport.mockRejectedValue({
      response: {
        status: 429,
        data: { message: "Plan service rate limited" },
      },
    });
    renderInterview();

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("success");
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate test report" }));

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("error");
      expect(screen.getByTestId("error").textContent).toBe(
        "Plan service rate limited",
      );
    });
  });

  it("shows a useful message for a network failure", async () => {
    generateInterviewReport.mockRejectedValue({
      request: {},
    });
    renderInterview();

    await waitFor(() => {
      expect(screen.getByTestId("status").textContent).toBe("success");
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate test report" }));

    await waitFor(() => {
      expect(screen.getByTestId("error").textContent).toMatch(
        /couldn't reach the interview plan service/i,
      );
    });
  });
});
