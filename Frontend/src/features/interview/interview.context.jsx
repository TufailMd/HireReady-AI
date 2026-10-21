import { createContext, useState } from "react";

// Context and provider intentionally share this module.
// eslint-disable-next-line react-refresh/only-export-components
export const InterviewContext = createContext(null);

export const InterviewProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [reports, setReports] = useState([]);
    const [error, setError] = useState(null);
    const [reportStatus, setReportStatus] = useState("idle");

    return (
        <InterviewContext.Provider
            value={{
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
            }}
        >
            {children}
        </InterviewContext.Provider>
    );
};