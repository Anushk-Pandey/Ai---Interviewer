import axios from "axios";

const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL || "http://localhost:3000",
    withCredentials: true,
})


/**
 * @description Service to generate interview report based on user self description, resume and job description.
 */
export const generateInterviewReport = async (data) => {
    const formData = new FormData()

    formData.append("resume", data.resumeFile) // file
    formData.append("jobDescription", data.jobDescription)
    formData.append("selfDescription", data.selfDescription)

    const res = await api.post("/api/interview", formData, {
        headers: {
            "Content-Type": "multipart/form-data"
        }
    })

    return res.data
}


/**
 * @description Service to get interview report by interviewId.
 */
export const getInterviewReportById = async (interviewId) => {
    const response = await api.get(`/api/interview/report/${interviewId}`)

    return response.data
}


/**
 * @description Service to get all interview reports of logged in user.
 */
export const getAllInterviewReports = async () => {
    const response = await api.get("/api/interview/")

    return response.data
}


/**
 * @description Service to generate resume pdf based on user self description, resume content and job description.
 */
export const generateResumePdf = async ({ interviewReportId }) => {
    const response = await api.post(`/api/interview/resume/pdf/${interviewReportId}`, null, {
        responseType: "blob"
    })

    return response.data
}

/**
 * @description Start a mock interview session based on a prep plan ID.
 */
export const startInterviewSession = async (reportId) => {
    const response = await api.post("/api/interview/session/start", { reportId })
    return response.data
}

/**
 * @description Get the state of an interview session.
 */
export const getInterviewSession = async (sessionId) => {
    const response = await api.get(`/api/interview/session/${sessionId}`)
    return response.data
}

/**
 * @description Submit the user's answer to the current question in the session.
 */
export const submitSessionAnswer = async (sessionId, userAnswer) => {
    const response = await api.post(`/api/interview/session/${sessionId}/answer`, { userAnswer })
    return response.data
}

/**
 * @description Complete the interview session and get overall feedback.
 */
export const completeInterviewSession = async (sessionId) => {
    const response = await api.post(`/api/interview/session/${sessionId}/complete`)
    return response.data
}