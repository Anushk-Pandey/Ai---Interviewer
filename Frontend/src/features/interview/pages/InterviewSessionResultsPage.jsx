import React, { useState, useEffect } from "react"
import { useParams, useNavigate } from "react-router"
import { getInterviewSession, startInterviewSession } from "../services/interview.api"
import "../style/session.scss"

const QuestionDetailCard = ({ q, index }) => {
    const [open, setOpen] = useState(index === 0)

    const getScoreClass = (score) => {
        if (score >= 8) return "score-high"
        if (score >= 6) return "score-mid"
        return "score-low"
    }

    return (
        <div className="q-result-card">
            <div className="q-result-card__header" onClick={() => setOpen(!open)}>
                <div className="q-result-card__title-group">
                    <span className="q-result-card__index">Q{index + 1}</span>
                    <span className={`q-type-badge ${q.type === 'technical' ? 'badge--tech' : 'badge--beh'}`}>
                        {q.type}
                    </span>
                    <p className="q-result-card__question">{q.question}</p>
                </div>
                <div className="q-result-card__right">
                    <span className={`q-result-score ${getScoreClass(q.score ?? 0)}`}>
                        {q.score ?? 0}/10
                    </span>
                    <span className={`q-result-chevron ${open ? "open" : ""}`}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                    </span>
                </div>
            </div>

            {open && (
                <div className="q-result-card__body">
                    <div className="q-result-section">
                        <h5>Candidate's Response:</h5>
                        <p className="user-answer-text">"{q.userAnswer || "No response provided"}"</p>
                    </div>

                    <div className="q-result-section">
                        <h5>Model Benchmark Answer:</h5>
                        <p className="model-answer-text">{q.modelAnswer}</p>
                    </div>

                    <div className="q-result-grid">
                        <div className="q-result-sub-section feedback-box">
                            <h5>🔍 AI Feedback &amp; Critique:</h5>
                            <p>{q.feedback || "No feedback generated."}</p>
                        </div>
                        <div className="q-result-sub-section suggestions-box">
                            <h5>💡 Actionable Suggestions:</h5>
                            <ul>
                                {q.suggestions?.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                )) || <li>No suggestions generated.</li>}
                            </ul>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}

const InterviewSessionResultsPage = () => {
    const { sessionId } = useParams()
    const navigate = useNavigate()
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [retryingSession, setRetryingSession] = useState(false)

    useEffect(() => {
        const fetchResults = async () => {
            try {
                const data = await getInterviewSession(sessionId)
                setSession(data.session)
                if (data.session.status !== "completed") {
                    alert("This session has not been completed yet.")
                    navigate(`/interview/session/${sessionId}`)
                }
            } catch (err) {
                console.error("Failed to load interview results:", err)
                alert("Could not load session results.")
            } finally {
                setLoading(false)
            }
        }
        fetchResults()
    }, [sessionId, navigate])

    const handlePracticeAgain = async () => {
        if (!session?.interviewReport?._id) return
        setRetryingSession(true)
        try {
            const data = await startInterviewSession(session.interviewReport._id)
            navigate(`/interview/session/${data.session._id}`)
        } catch (err) {
            console.error("Failed to start new interview session:", err)
            alert("Could not start a new session. Please try again.")
        } finally {
            setRetryingSession(false)
        }
    }

    const handlePrint = () => {
        window.print()
    }

    if (loading || !session) {
        return (
            <main className="loading-screen">
                <div className="spinner"></div>
                <h1>Loading final evaluation report...</h1>
            </main>
        )
    }

    const overallScore = session.overallScore ?? 0
    const scoreColor = overallScore >= 80 ? "score--high" : overallScore >= 60 ? "score--mid" : "score--low"

    return (
        <div className="results-page">
            {/* Header */}
            <div className="results-header">
                <div className="results-header__info">
                    <div className="brand-badge-small" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        <span>🤖</span>
                        <strong>AI Interviewer</strong>
                    </div>
                    <h1>AI Interview Assessment Report</h1>
                    <p className="results-subtitle-badge">
                        Mock Interview Assessment for: <strong>{session.interviewReport?.title || "Target Position"}</strong>
                    </p>
                </div>
                <div className="results-header__actions">
                    <button 
                        className="button secondary-button"
                        onClick={handlePrint}
                        title="Print or save as PDF"
                    >
                        🖨️ Print / Save Report
                    </button>
                    <button 
                        className="button primary-button"
                        onClick={handlePracticeAgain}
                        disabled={retryingSession}
                    >
                        {retryingSession ? "Starting..." : "🔄 Practice Again"}
                    </button>
                    <button 
                        className="button secondary-button"
                        onClick={() => navigate(`/interview/${session.interviewReport?._id}`)}
                    >
                        Plan Dashboard ➔
                    </button>
                </div>
            </div>

            {/* Assessment Dashboard Summary Card */}
            <div className="results-dashboard-card">
                <div className="results-dashboard-grid">
                    
                    {/* Circle Score Ring */}
                    <div className="results-score-panel">
                        <div className={`results-score-ring ${scoreColor}`}>
                            <span className="results-score-value">{overallScore}</span>
                            <span className="results-score-pct">%</span>
                        </div>
                        <h3 className="results-score-heading">Overall Performance Score</h3>
                        <p className="results-score-subtext">
                            {overallScore >= 80 ? "🎉 Outstanding Match! Strong performance across questions." : overallScore >= 60 ? "👍 Good Foundation with specific improvement areas." : "⚠️ Needs Additional Study & Practice"}
                        </p>
                    </div>

                    {/* Overall Summary Critique */}
                    <div className="results-feedback-panel">
                        <div className="feedback-column">
                            <h3>💻 Technical Knowledge &amp; Depth</h3>
                            <p>{session.technicalFeedback || "No technical feedback generated."}</p>
                        </div>
                        <div className="feedback-column">
                            <h3>🗣 Communication &amp; Articulation</h3>
                            <p>{session.communicationFeedback || "No communication feedback generated."}</p>
                        </div>
                    </div>

                </div>
            </div>

            {/* Takeaways Section: Strengths and Gaps */}
            <div className="takeaways-grid">
                <div className="takeaways-card takeaways-card--strengths">
                    <h3>🏆 Key Strengths Demonstrated</h3>
                    <ul>
                        {session.strengths?.map((str, i) => (
                            <li key={i}>
                                <span className="takeaways-icon">✓</span>
                                <p>{str}</p>
                            </li>
                        )) || <li>No strengths noted.</li>}
                    </ul>
                </div>

                <div className="takeaways-card takeaways-card--improvements">
                    <h3>🎯 Key Areas of Improvement</h3>
                    <ul>
                        {session.improvements?.map((imp, i) => (
                            <li key={i}>
                                <span className="takeaways-icon">➔</span>
                                <p>{imp}</p>
                            </li>
                        )) || <li>No improvements noted.</li>}
                    </ul>
                </div>
            </div>

            {/* Questions Breakdown List */}
            <div className="results-questions-section">
                <h2>Detailed Question-by-Question Breakdown</h2>
                <p className="section-subtitle">Click on any question below to inspect your answer, the benchmark model answer, and personalized feedback.</p>
                
                <div className="q-results-list">
                    {session.questions?.map((q, idx) => (
                        <QuestionDetailCard key={idx} q={q} index={idx} />
                    ))}
                </div>
            </div>
        </div>
    )
}

export default InterviewSessionResultsPage
