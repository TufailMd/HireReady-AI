
import { createContext, useState } from "react";

export const InterviewContext = createContext(null);

export const InterviewProvider = ({ children }) => {
    const [loading, setLoading] = useState(false);
    const [report, setReport] = useState(null);
    const [reports, setReports] = useState([]);
    const [error, setError] = useState(null);
    const [reportStatus, setReportStatus] = useState("idle");

    const value = {
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
    };

    return (
        <InterviewContext.Provider value={value}>
            {children}
        </InterviewContext.Provider>
    );
};