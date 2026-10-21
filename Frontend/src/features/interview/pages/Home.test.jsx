import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import Home from "./Home";

const { generateReport } = vi.hoisted(() => ({
  generateReport: vi.fn(),
}));

vi.mock("../hooks/useInterview.js", () => ({
  useInterview: () => ({
    loading: false,
    error: "",
    reports: [],
    generateReport,
  }),
}));

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}</output>;
};

const renderHome = () =>
  render(
    <MemoryRouter initialEntries={["/"]}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route
          path="/interview/:interviewId"
          element={<LocationProbe />}
        />
      </Routes>
    </MemoryRouter>,
  );

const fillJobDescription = () =>
  fireEvent.change(screen.getByLabelText("Job description"), {
    target: { value: "Frontend Engineer" },
  });

describe("Interview plan form", () => {
  beforeEach(() => {
    generateReport.mockResolvedValue(null);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it("shows inline validation for a missing job description", async () => {
    renderHome();

    fireEvent.change(screen.getByLabelText(/Self-description/), {
      target: { value: "Five years of frontend experience" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Interview Plan" }));

    expect(await screen.findByText("Enter the target job description.")).toBeTruthy();
    expect(generateReport).not.toHaveBeenCalled();
  });

  it("requires a resume or self-description", async () => {
    renderHome();
    fillJobDescription();

    fireEvent.click(screen.getByRole("button", { name: "Generate Interview Plan" }));

    expect(
      await screen.findByText("Upload a PDF resume or add a self-description."),
    ).toBeTruthy();
    expect(generateReport).not.toHaveBeenCalled();
  });

  it("shows selected filename and size, supports changing and removing the PDF", () => {
    renderHome();

    const input = screen.getByLabelText(/Resume PDF/);
    const file = new File(["pdf-content"], "Tufail Resume Final.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(input, {
      target: { files: [file] },
    });

    expect(screen.getByText("Tufail Resume Final.pdf")).toBeTruthy();
    expect(screen.getByText(/PDF document · 1 KB/)).toBeTruthy();
    expect(screen.getByText(/Selected/)).toBeTruthy();

    const replacement = new File(["replacement"], "A Long Resume Name With Spaces.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(input, { target: { files: [replacement] } });
    expect(screen.queryByText("Tufail Resume Final.pdf")).toBeNull();
    expect(screen.getByText("A Long Resume Name With Spaces.pdf")).toBeTruthy();

    fireEvent.click(
      screen.getByRole("button", {
        name: "Remove A Long Resume Name With Spaces.pdf",
      }),
    );
    expect(screen.queryByText("A Long Resume Name With Spaces.pdf")).toBeNull();
  });

  it("rejects non-PDF, empty, and oversized files", async () => {
    renderHome();
    const input = screen.getByLabelText(/Resume PDF/);

    fireEvent.change(input, {
      target: {
        files: [new File(["word"], "resume.docx", { type: "application/pdf" })],
      },
    });
    expect(await screen.findByText(/Choose a PDF file/)).toBeTruthy();

    fireEvent.change(input, {
      target: { files: [new File([], "empty.pdf", { type: "application/pdf" })] },
    });
    expect(await screen.findByText(/PDF is empty/)).toBeTruthy();

    fireEvent.change(input, {
      target: {
        files: [
          new File([new Uint8Array(3 * 1024 * 1024 + 1)], "large.pdf", {
            type: "application/pdf",
          }),
        ],
      },
    });
    expect(await screen.findByText(/3 MB or smaller/)).toBeTruthy();
  });

  it("accepts a valid PDF dropped into the upload area", () => {
    renderHome();
    const file = new File(["pdf-content"], "Dropped Resume.pdf", {
      type: "application/pdf",
    });
    const dropzone = screen.getByText("Choose a PDF or drop it here").closest("label");

    fireEvent.dragOver(dropzone, {
      dataTransfer: { files: [file] },
    });
    fireEvent.drop(dropzone, {
      dataTransfer: { files: [file] },
    });

    expect(screen.getByText("Dropped Resume.pdf")).toBeTruthy();
  });

  it("submits self-description without a file and navigates on success", async () => {
    generateReport.mockResolvedValue({ _id: "created-report" });
    renderHome();
    fillJobDescription();
    fireEvent.change(screen.getByLabelText(/Self-description/), {
      target: { value: "Experienced frontend developer" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate Interview Plan" }));

    await waitFor(() => {
      expect(generateReport).toHaveBeenCalledWith({
        jobDescription: "Frontend Engineer",
        selfDescription: "Experienced frontend developer",
        resumeFile: null,
      });
    });
    expect((await screen.findByTestId("location")).textContent).toBe(
      "/interview/created-report",
    );
  });

  it("submits a selected PDF in the report request", async () => {
    generateReport.mockResolvedValue({ _id: "pdf-report" });
    renderHome();
    fillJobDescription();
    const file = new File(["pdf-content"], "candidate resume.pdf", {
      type: "application/pdf",
    });
    fireEvent.change(screen.getByLabelText(/Resume PDF/), {
      target: { files: [file] },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Interview Plan" }));

    await waitFor(() => {
      expect(generateReport).toHaveBeenCalledWith({
        jobDescription: "Frontend Engineer",
        selfDescription: "",
        resumeFile: file,
      });
    });
    expect((await screen.findByTestId("location")).textContent).toBe(
      "/interview/pdf-report",
    );
  });

  it("preserves form input when report generation fails", async () => {
    generateReport.mockRejectedValue(new Error("Generation failed"));
    renderHome();
    fillJobDescription();
    fireEvent.change(screen.getByLabelText(/Self-description/), {
      target: { value: "Keep my profile text" },
    });

    fireEvent.click(screen.getByRole("button", { name: "Generate Interview Plan" }));

    await waitFor(() => {
      expect(
        screen
          .getAllByRole("alert")
          .some((alert) =>
            alert.textContent.includes(
              "We couldn't generate your plan. Please try again.",
            ),
          ),
      ).toBe(true);
    });
    expect(screen.getByLabelText("Job description").value).toBe("Frontend Engineer");
    expect(screen.getByLabelText(/Self-description/).value).toBe("Keep my profile text");
  });

  it("prevents duplicate submits while the request is pending", async () => {
    let completeRequest;
    generateReport.mockReturnValue(
      new Promise((resolve) => {
        completeRequest = resolve;
      }),
    );
    renderHome();
    fillJobDescription();
    fireEvent.change(screen.getByLabelText(/Self-description/), {
      target: { value: "Frontend developer" },
    });

    const submit = screen.getByRole("button", { name: "Generate Interview Plan" });
    fireEvent.click(submit);
    fireEvent.click(submit);
    expect(generateReport).toHaveBeenCalledTimes(1);

    completeRequest(null);
  });
});
