import { createBrowserRouter, Navigate } from "react-router";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Protected from "./features/auth/components/Protected";
import Layout from "./features/auth/components/layout/Layout";
import Home from "./features/interview/pages/Home";
import Interview from "./features/interview/pages/Interview";
import MyPlans from "./features/interview/pages/MyPlans";


export const router = createBrowserRouter([
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/register",
        element: <Register />
    },
    {
        element: <Protected><Layout /></Protected>,
        children: [
            { path: "/", element: <Home /> },
            { path: "/my-plans", element: <MyPlans /> },
            { path: "/interview/:interviewId", element: <Interview /> }
        ]
    },
    {
        path: "*",
        element: <Navigate to="/" replace />
    }
])
