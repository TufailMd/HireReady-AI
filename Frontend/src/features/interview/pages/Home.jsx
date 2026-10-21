import { useRef, useState } from "react";
import "../style/home.scss";
import { useInterview } from "../hooks/useInterview.js";
import { useNavigate } from "react-router";

const MAX_FILE_SIZE = 3 * 1024 * 1024;
const MAX_TEXT_LENGTH = 5000;

const formatFileSize = (size) =>
    size < 1024 * 1024
        ? `${Math.max(1, Math.round(size / 1024))} KB`
        : `${(size / (1024 * 1024)).toFixed(2)} MB`;

const Home = () => {
    const { loading, error, generateReport, reports } = useInterview();
    const [jobDescription, setJobDescription] = useState("");
    const [selfDescription, setSelfDescription] = useState("");
    const [resumeFile, setResumeFile] = useState(null);
    const [fileError, setFileError] = useState("");
    const [formErrors, setFormErrors] = useState({});
    const [submitError, setSubmitError] = useState("");
    const fileInputRef = useRef(null);
    const submittingRef = useRef(false);
    const navigate = useNavigate();

    const selectResume = (file) => {
        setFileError("");
        setFormErrors((previous) => ({ ...previous, resume: "" }));

        const rejectFile = (message) => {
            setResumeFile(null);
            setFileError(message);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        };

        if (!file) {
            setResumeFile(null);
            return;
        }

        if (!file.name.toLowerCase().endsWith(".pdf")) {
            rejectFile("Choose a PDF file. Other file types are not supported.");
            return;
        }

        if (file.type && !["application/pdf", "application/octet-stream"].includes(file.type)) {
            rejectFile("This file does not appear to be a PDF.");
            return;
        }

        if (file.size === 0) {
            rejectFile("This PDF is empty. Choose a different file.");
            return;
        }

        if (file.size > MAX_FILE_SIZE) {
            rejectFile("The PDF must be 3 MB or smaller.");
            return;
        }

        setResumeFile(file);
        setSubmitError("");
    };

    const clearResume = () => {
        setResumeFile(null);
        setFileError("");
        setFormErrors((previous) => ({ ...previous, resume: "" }));
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const handleDrop = (event) => {
        event.preventDefault();
        selectResume(event.dataTransfer.files?.[0]);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (submittingRef.current || loading) {
            return;
        }

        const nextErrors = {};
        if (!jobDescription.trim()) {
            nextErrors.jobDescription = "Enter the target job description.";
        }
        if (!resumeFile && !selfDescription.trim() && !fileError) {
            nextErrors.profile = "Upload a PDF resume or add a self-description.";
        }
        setFormErrors(nextErrors);
        setSubmitError("");

        if (Object.keys(nextErrors).length || fileError) {
            return;
        }

        submittingRef.current = true;
        try {
            const report = await generateReport({
                jobDescription: jobDescription.trim(),
                selfDescription: selfDescription.trim(),
                resumeFile,
            });

            if (report?._id) {
                navigate(`/interview/${report._id}`);
            }
        } catch {
            setSubmitError("We couldn't generate your plan. Please try again.");
        } finally {
            submittingRef.current = false;
        }
    };

    return (
        <div className="home-page">
            <header className="page-header">
                <p className="page-eyebrow">PERSONALIZED INTERVIEW PREPARATION</p>
                <h1>
                    Create Your Custom
                    <span className="highlight"> Interview Plan</span>
                </h1>
                <p className="page-intro">
                    Share the role and your experience. We’ll build a focused plan
                    to help you prepare with confidence.
                </p>
            </header>

            {(error || submitError) && (
                <div className="form-alert" role="alert" aria-live="assertive">
                    <span aria-hidden="true">!</span>
                    <p>{submitError || error}</p>
                </div>
            )}

            <form className="interview-card" onSubmit={handleSubmit} noValidate>
                <div className="interview-card__body">
                    <section className="panel panel--left" aria-labelledby="job-heading">
                        <div className="panel__header">
                            <span className="panel__step">01</span>
                            <div>
                                <h2 id="job-heading">Target job</h2>
                                <p>What role are you preparing for?</p>
                            </div>
                            <span className="badge badge--required">Required</span>
                        </div>

                        <label className="field-label" htmlFor="jobDescription">
                            Job description
                        </label>
                        <textarea
                            id="jobDescription"
                            name="jobDescription"
                            value={jobDescription}
                            onChange={(event) => {
                                setJobDescription(event.target.value);
                                setFormErrors((previous) => ({
                                    ...previous,
                                    jobDescription: "",
                                }));
                            }}
                            className={`panel__textarea${formErrors.jobDescription ? " is-invalid" : ""}`}
                            placeholder="Paste the job description, including responsibilities and qualifications..."
                            maxLength={MAX_TEXT_LENGTH}
                            aria-invalid={Boolean(formErrors.jobDescription)}
                            aria-describedby="job-counter job-error"
                            required
                        />
                        <div className="field-meta">
                            <span id="job-error" className="field-error" role="alert">
                                {formErrors.jobDescription}
                            </span>
                            <span id="job-counter" className="char-counter">
                                {jobDescription.length} / {MAX_TEXT_LENGTH}
                            </span>
                        </div>
                    </section>

                    <div className="panel-divider" aria-hidden="true" />

                    <section className="panel panel--right" aria-labelledby="profile-heading">
                        <div className="panel__header">
                            <span className="panel__step">02</span>
                            <div>
                                <h2 id="profile-heading">Your experience</h2>
                                <p>Choose one way to tell us about yourself.</p>
                            </div>
                        </div>

                        <div className="upload-section">
                            <div className="section-heading">
                                <label className="field-label" htmlFor="resume">
                                    Resume <span className="optional-label">PDF · up to 3 MB</span>
                                </label>
                            </div>
                            <label
                                className={`dropzone${resumeFile ? " is-selected" : ""}${fileError ? " is-invalid" : ""}`}
                                htmlFor="resume"
                                onDragOver={(event) => event.preventDefault()}
                                onDrop={handleDrop}
                            >
                                <input
                                    ref={fileInputRef}
                                    className="file-input"
                                    type="file"
                                    id="resume"
                                    name="resume"
                                    accept=".pdf,application/pdf"
                                    onChange={(event) => selectResume(event.target.files?.[0])}
                                    aria-invalid={Boolean(fileError)}
                                    aria-describedby="resume-error resume-help"
                                />
                                <span className="dropzone__icon" aria-hidden="true">
                                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                                        <path d="M12 16V4m0 0L7.5 8.5M12 4l4.5 4.5" />
                                        <path d="M5 14.5v3A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-3" />
                                    </svg>
                                </span>
                                <span className="dropzone__title">
                                    {resumeFile ? "Change your PDF" : "Choose a PDF or drop it here"}
                                </span>
                                <span id="resume-help" className="dropzone__subtitle">
                                    PDF documents only
                                </span>
                            </label>

                            {resumeFile && (
                                <div className="file-card" aria-live="polite">
                                    <span className="file-card__icon" aria-hidden="true">PDF</span>
                                    <span className="file-card__details">
                                        <span className="file-card__name" title={resumeFile.name}>
                                            {resumeFile.name}
                                        </span>
                                        <span className="file-card__meta">
                                            PDF document · {formatFileSize(resumeFile.size)}
                                        </span>
                                    </span>
                                    <span className="file-card__status">
                                        <span aria-hidden="true">✓</span> Selected
                                    </span>
                                    <button
                                        type="button"
                                        className="file-card__remove"
                                        onClick={clearResume}
                                        aria-label={`Remove ${resumeFile.name}`}
                                    >
                                        Remove
                                    </button>
                                </div>
                            )}
                            <p id="resume-error" className="field-error" role="alert">
                                {fileError || formErrors.resume}
                            </p>
                        </div>

                        <div className="or-divider"><span>OR</span></div>

                        <div className="self-description">
                            <label className="field-label" htmlFor="selfDescription">
                                Self-description
                                <span className="optional-label">If not using a resume</span>
                            </label>
                            <textarea
                                id="selfDescription"
                                name="selfDescription"
                                value={selfDescription}
                                onChange={(event) => {
                                    setSelfDescription(event.target.value);
                                    setFormErrors((previous) => ({
                                        ...previous,
                                        profile: "",
                                    }));
                                }}
                                className={`panel__textarea panel__textarea--short${formErrors.profile ? " is-invalid" : ""}`}
                                maxLength={MAX_TEXT_LENGTH}
                                placeholder="Describe your experience, skills, and achievements..."
                                aria-invalid={Boolean(formErrors.profile)}
                                aria-describedby="profile-error self-counter"
                            />
                            <div className="field-meta">
                                <span id="profile-error" className="field-error" role="alert">
                                    {formErrors.profile}
                                </span>
                                <span id="self-counter" className="char-counter">
                                    {selfDescription.length} / {MAX_TEXT_LENGTH}
                                </span>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="interview-card__footer">
                    <p className="footer-info">
                        Your resume or self-description is used to personalize your plan.
                    </p>
                    <button
                        type="submit"
                        className="generate-btn"
                        disabled={loading}
                        aria-busy={loading}
                    >
                        {loading ? (
                            <>
                                <span className="button-spinner" aria-hidden="true" />
                                Generating Plan…
                            </>
                        ) : (
                            "Generate Interview Plan"
                        )}
                    </button>
                </div>
            </form>

            {reports.length > 0 && (
                <section className="recent-reports" aria-labelledby="recent-heading">
                    <h2 id="recent-heading">Recent interview plans</h2>
                    <ul className="reports-list">
                        {reports.map((report) => (
                            <li key={report._id}>
                                <button
                                    type="button"
                                    className="report-item"
                                    onClick={() => navigate(`/interview/${report._id}`)}
                                >
                                    <span className="report-item__title">
                                        {report.title || "Untitled position"}
                                    </span>
                                    <span className="report-meta">
                                        Generated {new Date(report.createdAt).toLocaleDateString()}
                                    </span>
                                    <span className="report-item__score">
                                        Match score: {report.matchScore}%
                                    </span>
                                </button>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
};

export default Home;
