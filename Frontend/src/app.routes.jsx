import { createBrowserRouter } from "react-router";
import Login from "./features/auth/pages/Login";
import Register from "./features/auth/pages/Register";
import Home from "./features/interview/pages/Home";
import Interview from "./features/interview/pages/Interview";
import InterviewSessionPage from "./features/interview/pages/InterviewSessionPage";
import InterviewSessionResultsPage from "./features/interview/pages/InterviewSessionResultsPage";

export const router = createBrowserRouter([
    {
        path: "/",
        element: <Home />
    },
    {
        path: "/login",
        element: <Login />
    },
    {
        path: "/register",
        element: <Register />
    },
    {
        path: "/interview/:interviewId",
        element: <Interview />
    },
    {
        path: "/interview/session/:sessionId",
        element: <InterviewSessionPage />
    },
    {
        path: "/interview/session/:sessionId/results",
        element: <InterviewSessionResultsPage />
    }
])