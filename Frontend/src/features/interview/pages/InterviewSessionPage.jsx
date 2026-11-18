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
    const [isSpeaking, setIsSpeaking] = useState(false)
    const [autoReadVoice, setAutoReadVoice] = useState(true)
    const [answerSeconds, setAnswerSeconds] = useState(0)
    const [speechSupported, setSpeechSupported] = useState(true)

    const recognitionRef = useRef(null)
    const timerRef = useRef(null)

    // Load Session
    useEffect(() => {
        const fetchSession = async () => {
            try {
                const data = await getInterviewSession(sessionId)
                setSession(data.session)
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

    // Check Speech Recognition capability
    useEffect(() => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRec) {
            setSpeechSupported(false)
        }
    }, [])

    // Timer logic: count up while answer is in progress (not evaluated yet)
    useEffect(() => {
        if (!evaluation && !loading && session && session.status === "active") {
            timerRef.current = setInterval(() => {
                setAnswerSeconds(prev => prev + 1)
            }, 1000)
        } else {
            if (timerRef.current) clearInterval(timerRef.current)
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current)
        }
    }, [evaluation, loading, session])

    const currentIdx = session?.currentQuestionIndex ?? 0
    const currentQuestion = session?.questions?.[currentIdx]

    // Text-To-Speech: Read question aloud
    const speakText = (text) => {
        if (!("speechSynthesis" in window)) return
        window.speechSynthesis.cancel()

        const utterance = new SpeechSynthesisUtterance(text)
        utterance.rate = 1.0
        utterance.pitch = 1.0

        // Attempt to find a high quality English voice
        const voices = window.speechSynthesis.getVoices()
        const selectedVoice = voices.find(v => (v.lang.startsWith("en") && (v.name.includes("Natural") || v.name.includes("Google") || v.name.includes("Samantha")))) || voices.find(v => v.lang.startsWith("en"))
        if (selectedVoice) {
            utterance.voice = selectedVoice
        }

        utterance.onstart = () => setIsSpeaking(true)
        utterance.onend = () => setIsSpeaking(false)
        utterance.onerror = () => setIsSpeaking(false)

        window.speechSynthesis.speak(utterance)
    }

    const stopSpeaking = () => {
        if ("speechSynthesis" in window) {
            window.speechSynthesis.cancel()
            setIsSpeaking(false)
        }
    }

    // Auto-read question when a new question loads
    useEffect(() => {
        if (currentQuestion && autoReadVoice && !evaluation) {
            const timer = setTimeout(() => {
                speakText(currentQuestion.question)
            }, 600)
            return () => {
                clearTimeout(timer)
                stopSpeaking()
            }
        }
        return () => stopSpeaking()
    }, [currentIdx, currentQuestion, autoReadVoice, evaluation])

    // Speech-to-text logic
    const handleMicToggle = () => {
        const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition
        if (!SpeechRec) {
            alert("Voice speech recognition is not supported in this browser. Please type your answer directly.")
            return
        }

        if (isListening) {
            if (recognitionRef.current) {
                recognitionRef.current.stop()
            }
            setIsListening(false)
        } else {
            // Stop interviewer voice if candidate starts speaking
            stopSpeaking()

            const rec = new SpeechRec()
            rec.continuous = true
            rec.interimResults = false
            rec.lang = "en-US"

            rec.onstart = () => setIsListening(true)
            rec.onend = () => setIsListening(false)
            rec.onerror = (e) => {
                console.error("Speech recognition error:", e.error)
                setIsListening(false)
            }
            rec.onresult = (event) => {
                const speechToText = event.results[event.results.length - 1][0].transcript
                setUserAnswer(prev => prev + (prev.endsWith(" ") || prev === "" ? "" : " ") + speechToText)
            }

            recognitionRef.current = rec
            try {
                rec.start()
            } catch (err) {
                console.error("Speech start failed:", err)
            }
        }
    }

    const handleSubmitAnswer = async () => {
        if (!userAnswer.trim()) {
            alert("Please type or speak your answer before submitting.")
            return
        }

        stopSpeaking()

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
        stopSpeaking()
        setLoading(true)
        try {
            const data = await getInterviewSession(sessionId)
            setSession(data.session)
            setUserAnswer("")
            setEvaluation(null)
            setShowModelAnswer(false)
            setAnswerSeconds(0)

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
        stopSpeaking()
        setLoading(true)
        try {
            await completeInterviewSession(sessionId)
            navigate(`/interview/session/${sessionId}/results`)
        } catch (err) {
            console.error("Failed to complete session:", err)
            alert("Could not complete interview session.")
            setLoading(false)
        }
    }

    const handleExit = () => {
        if (window.confirm("Are you sure you want to exit? Your progress in this session is saved, and you can resume anytime.")) {
            stopSpeaking()
            navigate(`/interview/${session?.interviewReport?._id || ''}`)
        }
    }

    const formatTime = (secs) => {
        const m = Math.floor(secs / 60)
        const s = secs % 60
        return `${m < 10 ? '0' : ''}${m}:${s < 10 ? '0' : ''}${s}`
    }

    const getScoreColorClass = (score) => {
        if (score >= 8) return "score-badge--excellent"
        if (score >= 6) return "score-badge--good"
        if (score >= 4) return "score-badge--fair"
        return "score-badge--poor"
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
    const progressPercent = Math.min(100, Math.round(((evaluation ? currentIdx + 1 : currentIdx) / totalQs) * 100))

    return (
        <div className="session-page">
            {/* Header */}
            <div className="session-header">
                <div className="session-header__info">
                    <div className="brand-badge-small" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                        <span>🤖</span>
                        <strong>AI Interviewer</strong>
                    </div>
                    <h1>Live AI Mock Interview</h1>
                    <p className="session-title-badge">
                        Target Role: <strong>{session.interviewReport?.title || "Target Position"}</strong>
                    </p>
                </div>

                <div className="session-header__actions">
                    <button className="button danger-button cancel-btn" onClick={handleExit}>
                        Exit Session
                    </button>
                </div>
            </div>

            {/* Progress Bar & Voice Controls */}
            <div className="session-toolbar">
                <div className="progress-container">
                    <div className="progress-text">
                        <span>Question {Math.min(totalQs, currentIdx + 1)} of {totalQs}</span>
                        <span>{progressPercent}% Completed</span>
                    </div>
                    <div className="progress-bar-bg">
                        <div className="progress-bar-fill" style={{ width: `${progressPercent}%` }}></div>
                    </div>
                </div>

                <div className="voice-toggles">
                    <label className="toggle-switch" title="Automatically read new questions out loud">
                        <input 
                            type="checkbox" 
                            checked={autoReadVoice} 
                            onChange={(e) => setAutoReadVoice(e.target.checked)} 
                        />
                        <span className="toggle-label">Auto-Voice 🔊</span>
                    </label>
                </div>
            </div>

            {currentQuestion ? (
                <div className="workspace-grid">
                    {/* Left Column: Interviewer & Question Panel */}
                    <div className="workspace-panel panel-question">
                        {/* Interviewer Persona Card */}
                        <div className="interviewer-persona">
                            <div className="interviewer-avatar">
                                <span className="persona-emoji">👔</span>
                                <span className={`avatar-status-dot ${isSpeaking ? 'status--speaking' : isListening ? 'status--listening' : 'status--ready'}`} />
                            </div>
                            <div className="interviewer-meta">
                                <h3>Alex &bull; AI Interviewer</h3>
                                <p className="interviewer-status">
                                    {isSpeaking ? (
                                        <span className="speaking-anim">🔊 Speaking question...</span>
                                    ) : isListening ? (
                                        <span className="listening-anim">🎙️ Listening to your answer...</span>
                                    ) : submitting ? (
                                        <span>💭 Analyzing your answer...</span>
                                    ) : (
                                        <span>Ready for your response</span>
                                    )}
                                </p>
                            </div>

                            {/* Audio Read / Stop Button */}
                            <button 
                                className={`audio-btn ${isSpeaking ? 'audio-btn--active' : ''}`}
                                onClick={() => {
                                    if (isSpeaking) stopSpeaking()
                                    else speakText(currentQuestion.question)
                                }}
                                title={isSpeaking ? "Stop voice" : "Read question aloud"}
                            >
                                {isSpeaking ? (
                                    <>
                                        <span className="sound-wave">
                                            <span></span><span></span><span></span>
                                        </span>
                                        <span>Stop Audio</span>
                                    </>
                                ) : (
                                    <>
                                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/></svg>
                                        <span>Read Aloud</span>
                                    </>
                                )}
                            </button>
                        </div>

                        <div className="card-badge">
                            <span className={`badge ${currentQuestion.type === "technical" ? "badge--tech" : "badge--beh"}`}>
                                {currentQuestion.type} Question
                            </span>
                        </div>

                        <h2 className="question-text">{currentQuestion.question}</h2>
                        
                        <div className="intention-box">
                            <h4>🔍 Interviewer's Evaluation Focus:</h4>
                            <p>{currentQuestion.intention}</p>
                        </div>
                    </div>

                    {/* Right Column: Answer Input & Evaluation */}
                    <div className="workspace-panel panel-action">
                        {!evaluation ? (
                            <div className="answer-wrapper">
                                <div className="answer-header">
                                    <div className="answer-title-group">
                                        <h3>Your Response</h3>
                                        <p className="response-hint">Speak into your mic or type your explanation below.</p>
                                    </div>
                                    <div className="answer-timer-badge" title="Response elapsed time">
                                        ⏱️ {formatTime(answerSeconds)}
                                    </div>
                                </div>

                                {isListening && (
                                    <div className="live-listening-bar">
                                        <div className="pulsing-mic-dot"></div>
                                        <span>Listening... Speak clearly. Your speech will be transcribed below.</span>
                                    </div>
                                )}
                                
                                <div className="textarea-container">
                                    <textarea
                                        value={userAnswer}
                                        onChange={(e) => setUserAnswer(e.target.value)}
                                        placeholder="Start explaining your answer here... You can also click the microphone icon below to speak naturally."
                                        disabled={submitting}
                                    />
                                    
                                    <button 
                                        type="button"
                                        className={`mic-button ${isListening ? "mic-button--listening" : ""}`}
                                        onClick={handleMicToggle}
                                        title={isListening ? "Click to stop listening" : "Click to speak answer via microphone"}
                                        disabled={submitting}
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                            <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/>
                                            <path d="M19 10v1a7 7 0 0 1-14 0v-1"/>
                                            <line x1="12" y1="19" x2="12" y2="22"/>
                                        </svg>
                                    </button>
                                </div>

                                {!speechSupported && (
                                    <p className="voice-unsupported-note">
                                        ℹ️ Note: Speech recognition is not supported in this browser. Please type your response directly into the textarea.
                                    </p>
                                )}

                                <div className="action-buttons">
                                    <button 
                                        className="button primary-button submit-btn" 
                                        onClick={handleSubmitAnswer}
                                        disabled={submitting || !userAnswer.trim()}
                                    >
                                        {submitting ? (
                                            <>
                                                <span className="button-spinner"></span> AI is analyzing your response...
                                            </>
                                        ) : "Submit Response"}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="evaluation-wrapper">
                                <div className="evaluation-header">
                                    <div>
                                        <h3>Real-Time AI Evaluation</h3>
                                        <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', color: '#7d8590' }}>Response time: {formatTime(answerSeconds)}</p>
                                    </div>
                                    <div className={`evaluation-score-badge ${getScoreColorClass(evaluation.score)}`}>
                                        <span className="score-val">{evaluation.score}</span>
                                        <span className="score-max">/10</span>
                                    </div>
                                </div>

                                <div className="feedback-section">
                                    <h4>Feedback &amp; Critique:</h4>
                                    <p>{evaluation.feedback}</p>
                                </div>

                                <div className="suggestions-section">
                                    <h4>Key Actionable Suggestions:</h4>
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
                                        <span>{showModelAnswer ? "Hide" : "Compare with"} Model Answer</span>
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
                                            {loading ? "Generating Final Assessment..." : "Complete Interview & View Assessment Report ➔"}
                                        </button>
                                    ) : (
                                        <button className="button primary-button next-btn" onClick={handleNextQuestion} disabled={loading}>
                                            Next Question ➔
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
                    <p>All interview questions have been answered. View your final evaluation report.</p>
                    <button className="button primary-button" onClick={handleCompleteSession}>
                        View Results
                    </button>
                </div>
            )}
        </div>
    )
}

export default InterviewSessionPage
