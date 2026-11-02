import { useAuth } from "../hooks/useAuth";
import { Navigate } from "react-router";
import Loader from "../../../components/common/Loader";

const Protected = ({ children }) => {
    const { initializing, user } = useAuth()

    if (initializing) {
        return <Loader message="Checking your session..." variant="fullscreen" />
    }

    if (!user) {
        return <Navigate to={'/login'} />
    }

    return children
}

export default Protected