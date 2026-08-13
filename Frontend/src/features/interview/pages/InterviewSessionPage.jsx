const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

import React, { useState, useEffect, useRef } from "react"
import { useParams, useNavigate } from "react-router"
import { getInterviewSession, submitSessionAnswer, completeInterviewSession } from "../services/interview.api"
import "../style/session.scss"

const InterviewSessionPage = () => {
    const { sessionId } = useParams()
    const navigate = useNavigate()
    const [session, setSession] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [userAnswer, setUserAnswer] = useState("")
    const [evaluation, setEvaluation] = useState(null)
    const [showModelAnswer, setShowModelAnswer] = useState(false)
    const [isListening, setIsListening] = useState(false)

    const recognitionRef = useRef(null)

    useEffect(() => {
        const fetchSession = async () => {
            try {
                const data = await getInterviewSession(sessionId)
                setSession(data.session)
                // If session is already completed, go to results
                if (data.session.status === "completed") {
                    navigate(`/interview/session/${sessionId}/results`)
                }
            } catch (err) {
                console.error("Failed to load interview session:", err)
                alert("Could not load interview session.")
            } finally {
                setLoading(false)
            }
        }
        fetchSession()
    }, [sessionId, navigate])

    // Speech-to-text logic
    const handleMicToggle = () => {
        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            setIsListening(false)
        } else {
            if (!SpeechRecognition) {
                alert("Voice recognition is not supported in this browser. Please type your answer instead.")
                return
            }

            const rec = new SpeechRecognition()
            rec.continuous = true;
            rec.interimResults = false;
            rec.lang = "en-US"

            rec.onstart = () => {
                setIsListening(true)
            }
            rec.onend = () => {
                setIsListening(false)
            }
            rec.onerror = (e) => {
                console.error("Speech recognition error:", e.error)
                setIsListening(false)
            }
            rec.onresult = (event) => {
                const speechToText = event.results[event.results.length - 1][0].transcript
                setUserAnswer(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + speechToText)
            }

            recognitionRef.current = rec
            rec.start()
        }
    }

    const handleSubmitAnswer = async () => {
        if (!userAnswer.trim()) {
            alert("Please type or speak your answer before submitting.")
            return
        }

        // Stop recording if active
        if (isListening && recognitionRef.current) {
            recognitionRef.current.stop()
            setIsListening(false)
        }

        setSubmitting(true)
        try {
            const data = await submitSessionAnswer(sessionId, userAnswer)
            setEvaluation(data.evaluation)
        } catch (err) {
            console.error("Failed to submit answer:", err)
            const errMsg = err.response?.data?.message || err.message || "Failed to evaluate answer"
            alert("Error: " + errMsg)
        } finally {
            setSubmitting(false)
        }
    }

    const handleNextQuestion = async () => {
        setLoading(true)
        try {
            const data = await getInterviewSession(sessionId)
            setSession(data.session)
            setUserAnswer("")
            setEvaluation(null)
            setShowModelAnswer(false)

            // If we've answered all questions, complete the session
            if (data.session.currentQuestionIndex >= data.session.questions.length) {
                handleCompleteSession()
                return
            }
        } catch (err) {
            console.error("Failed to transition question:", err)
            alert("Could not load the next question.")
        } finally {
            setLoading(false)
        }
    }

    const handleCompleteSession = async () => {
        setLoading(true)
        try {
            const data = await completeInterviewSession(sessionId)
            navigate(`/interview/session/${sessionId}/results`)
        } catch (err) {
            console.error("Failed to complete session:", err)
            alert("Could not complete interview session.")
            setLoading(false)
        }
    }

    if (loading || !session) {
        return (
            <main className="loading-screen">
                <div className="spinner"></div>
                <h1>Loading your interview workspace...</h1>
            </main>
        )
    }

    const totalQs = session.questions.length
    const currentIdx = session.currentQuestionIndex
    const currentQuestion = session.questions[currentIdx]

    // Calculate progress percentage
    const progressPercent = Math.min(100, Math.round((currentIdx / totalQs) * 100))

    return (
        <div className="session-page">
            <div className="session-header">
                <div className="session-header__info">
                    <h1>AI Mock Interview Session</h1>
                    <p className="session-title-badge">{session.interviewReport?.title || "Untitled Role"}</p>
                </div>
                <button className="button danger-button cancel-btn" onClick={() => navigate(`/interview/${session.interviewReport?._id}`)}>
                    Exit Session
                </button>
            </div>

            {/* Progress Bar */}
            <div className="progress-container">
                <div className="progress-text">
                    <span>Question {Math.min(totalQs, currentIdx + 1)} of {totalQs}</span>
                    <span>{progressPercent}% Complete</span>
                </div>
                <div className="progress-bar-bg">
                    <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                </div>
            </div>

            {currentQuestion ? (
                <div className="workspace-grid">
                    {/* Left Column: Current Question Card */}
                    <div className="workspace-panel panel-question">
                        <div className="card-badge">
                            <span className={`badge ${currentQuestion.type === "technical" ? "badge--tech" : "badge--beh"}`}>
                                {currentQuestion.type} question
                            </span>
                        </div>
                        <h2 className="question-text">{currentQuestion.question}</h2>
                        
                        <div className="intention-box">
                            <h4>🔍 Interviewer's Intention:</h4>
                            <p>{currentQuestion.intention}</p>
                        </div>
                    </div>

                    {/* Right Column: Answer Input & Evaluation */}
                    <div className="workspace-panel panel-action">
                        {!evaluation ? (
                            <div className="answer-wrapper">
                                <h3>Your Response</h3>
                                <p className="response-hint">Type your answer below, or click the microphone to speak your response.</p>
                                
                                <div className="textarea-container">
                                    <textarea
                                        value={userAnswer}
                                        onChange={(e) => setUserAnswer(e.target.value)}
                                        placeholder="Start explaining your answer here..."
                                        disabled={submitting}
                                    />
                                    
                                    <button 
                                        className={`mic-button ${isListening ? "mic-button--listening" : ""}`}
                                        onClick={handleMicToggle}
                                        title={isListening ? "Stop listening" : "Start speaking"}
                                        disabled={submitting}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                                            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                                            <line x1="12" y1="19" x2="12" y2="22"/>
                                        </svg>
                                    </button>
                                </div>

                                <div className="action-buttons">
                                    <button 
                                        className="button primary-button submit-btn" 
                                        onClick={handleSubmitAnswer}
                                        disabled={submitting}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="button-spinner"></span> Evaluating response...
                                            </>
                                        ) : "Submit Response"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="evaluation-wrapper">
                                <div className="evaluation-header">
                                    <h3>Real-Time AI Evaluation</h3>
                                    <div className="evaluation-score-badge">
                                        <span className="score-val">{evaluation.score}</span>
                                        <span className="score-max">/10</span>
                                    </div>
                                </div>

                                <div className="feedback-section">
                                    <h4>Feedback:</h4>
                                    <p>{evaluation.feedback}</p>
                                </div>

                                <div className="suggestions-section">
                                    <h4>Key Suggestions for Improvement:</h4>
                                    <ul>
                                        {evaluation.suggestions?.map((sug, i) => (
                                            <li key={i}>{sug}</li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="model-answer-section">
                                    <button 
                                        className="model-answer-toggle"
                                        onClick={() => setShowModelAnswer(!showModelAnswer)}
                                    >
                                        <span>{showModelAnswer ? "Hide" : "Show"} Model Answer</span>
                                        <svg className={showModelAnswer ? "rotated" : ""} xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9" /></svg>
                                    </button>
                                    {showModelAnswer && (
                                        <div className="model-answer-body">
                                            <p>{currentQuestion.modelAnswer}</p>
                                        </div>
                                    )}
                                </div>

                                <div className="next-action-wrapper">
                                    {currentIdx + 1 >= totalQs ? (
                                        <button className="button primary-button final-btn" onClick={handleCompleteSession} disabled={loading}>
                                            {loading ? "Generating Report..." : "Complete Interview & Get Final Report"}
                                        </button>
                                    ) : (
                                        <button className="button primary-button next-btn" onClick={handleNextQuestion} disabled={loading}>
                                            Next Question
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                <div className="no-questions-card">
                    <h2>Session Completed</h2>
                    <p>Click below to generate and see your overall report.</p>
                    <button className="button primary-button" onClick={handleCompleteSession}>
                        View Results
                    </button>
                </div>
            )}
        </div>
    )
}

export default InterviewSessionPage
