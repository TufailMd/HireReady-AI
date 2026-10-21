
import { Navigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import Loading from "../components/Loading";

const Protected = ({ children }) => {
    const { loading, user } = useAuth();

    if (loading) {
        return <Loading message="Loading your account..." />;
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    return children;
};

export default Protected;
