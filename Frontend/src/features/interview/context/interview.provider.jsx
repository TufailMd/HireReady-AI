import { useState } from "react";
import { InterviewContext } from "./interview.context"

export const InterviewProvider = ({ children }) => {
    const [loading, setLoading] = useState(false)
    const [report, setReport] = useState(null)
    const [reports, setReports] = useState([])
    const [reportsLoaded, setReportsLoaded] = useState(false)

    return (
        <InterviewContext.Provider value={{ loading, setLoading, report, setReport, reports, setReports, reportsLoaded, setReportsLoaded }}>
            {children}
        </InterviewContext.Provider>
    )
}