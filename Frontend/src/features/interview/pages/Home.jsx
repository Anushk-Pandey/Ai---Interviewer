import React, { useState, useRef, useEffect } from 'react'
import "../style/home.scss"
import { useInterview } from '../hooks/useInterview.js'
import { useNavigate, Link } from 'react-router'
import { useAuth } from '../../auth/hooks/useAuth.js'

const Home = () => {
    const { user, handleLogout } = useAuth()
    const { generateReport, reports } = useInterview()
    const [jobDescription, setJobDescription] = useState("")
    const [selfDescription, setSelfDescription] = useState("")
    const [selectedFile, setSelectedFile] = useState(null)
    const [isDragging, setIsDragging] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [progressStep, setProgressStep] = useState(0)
    const [errorMessage, setErrorMessage] = useState("")
    const resumeInputRef = useRef()
    const navigate = useNavigate()

    // Step-by-step progress animation during plan generation
    useEffect(() => {
        let interval;
        if (isGenerating) {
            setProgressStep(1)
            interval = setInterval(() => {
                setProgressStep(prev => (prev < 4 ? prev + 1 : prev))
            }, 3500)
        } else {
            setProgressStep(0)
        }
        return () => clearInterval(interval)
    }, [isGenerating])

    const handleFileValidation = (file) => {
        if (!file) return false
        if (file.type !== "application/pdf" && !file.name.endsWith('.pdf')) {
            setErrorMessage("Only PDF files are supported for resume analysis.")
            return false
        }
        if (file.size > 5 * 1024 * 1024) {
            setErrorMessage("PDF file must be less than 5MB.")
            return false
        }
        if (file.size === 0) {
            setErrorMessage("Selected PDF file is empty.")
            return false
        }
        setErrorMessage("")
        return true
    }

    const handleFileChange = (e) => {
        const file = e.target.files[0]
        if (file && handleFileValidation(file)) {
            setSelectedFile(file)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setIsDragging(false)
        const file = e.dataTransfer.files[0]
        if (file && handleFileValidation(file)) {
            setSelectedFile(file)
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleRemoveFile = (e) => {
        e.stopPropagation()
        e.preventDefault()
        setSelectedFile(null)
        if (resumeInputRef.current) {
            resumeInputRef.current.value = ""
        }
    }

    const handleGenerateReport = async () => {
        setErrorMessage("")
        const resumeFile = selectedFile || resumeInputRef.current?.files[0]

        if (!jobDescription || jobDescription.trim() === "") {
            setErrorMessage("Please enter the target job description.")
            return
        }

        if (!resumeFile && (!selfDescription || selfDescription.trim() === "")) {
            setErrorMessage("Please upload your resume PDF or provide a brief self-description.")
            return
        }

        setIsGenerating(true)
        try {
            const data = await generateReport({
                jobDescription,
                selfDescription,
                resumeFile
            })

            if (!data || !data._id) return
            navigate(`/interview/${data._id}`)
        } catch (err) {
            console.error("handleGenerateReport failed:", err)
            const errMsg = err.response?.data?.message || err.message || "Failed to generate interview blueprint. Please try again."
            setErrorMessage("Error: " + errMsg)
        } finally {
            setIsGenerating(false)
        }
    }

    if (isGenerating) {
        const steps = [
            "Parsing Job Description & Requirements...",
            "Analyzing Candidate Profile & Resume Experience...",
            "Synthesizing Tailored Technical & Behavioral Questions...",
            "Constructing Day-Wise Preparation Roadmap..."
        ]

        return (
            <main className='loading-screen'>
                <div className="generation-loader-card">
                    <div className="spinner-glow"></div>
                    <h2>Crafting Your AI Interview Blueprint</h2>
                    <p className="loading-subtitle">Our AI interviewer is personalizing questions and evaluation criteria...</p>
                    
                    <div className="generation-steps">
                        {steps.map((text, idx) => (
                            <div key={idx} className={`step-item ${progressStep > idx ? 'step-item--done' : progressStep === idx + 1 ? 'step-item--active' : ''}`}>
                                <div className="step-indicator">
                                    {progressStep > idx ? (
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                                    ) : (
                                        <span>{idx + 1}</span>
                                    )}
                                </div>
                                <span>{text}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </main>
        )
    }

    return (
        <div className='home-page'>
            {/* Top Navigation Taskbar */}
            <header className='top-nav'>
                <div className='brand-badge' onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <span className='brand-icon'>🤖</span>
                    <span className='brand-title'>AI Interviewer</span>
                </div>

                <div className='nav-right'>
                    {user ? (
                        <div className='auth-user-group'>
                            <div className='user-badge'>
                                <span className='user-avatar'>
                                    {user?.username?.charAt(0).toUpperCase() || 'U'}
                                </span>
                                <span className='user-name'>{user?.username}</span>
                            </div>
                            <button onClick={handleLogout} className='logout-btn' title="Log out">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
                                Logout
                            </button>
                        </div>
                    ) : (
                        <div className='guest-nav-actions'>
                            <button className='nav-btn nav-btn--login' onClick={() => navigate('/login')}>
                                Log In
                            </button>
                            <button className='nav-btn nav-btn--signup' onClick={() => navigate('/register')}>
                                Sign Up
                            </button>
                        </div>
                    )}
                </div>
            </header>

            {/* Guest Mode Callout Banner */}
            {!user && (
                <div className='guest-status-banner'>
                    <div className='guest-status-icon'>💡</div>
                    <div className='guest-status-content'>
                        <strong>Guest Mode Active:</strong> You can practice interviews freely without logging in. To save your interview plans, practice sessions, and performance reports across visits, <Link to="/login">Log In</Link> or <Link to="/register">Create an Account</Link>.
                    </div>
                </div>
            )}

            {/* Hero Section */}
            <header className='page-header'>
                <span className='hero-eyebrow'>Next-Generation Interview Preparation</span>
                <h1>Your Personal <span className='highlight'>AI Interviewer</span></h1>
                <p>Prepare with realistic AI mock interviews, spoken questions, real-time voice answering, instant scoring, and targeted study roadmaps.</p>
            </header>

            {errorMessage && (
                <div className="home-error-banner">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Main Interactive Strategy Card */}
            <div className='interview-card'>
                <div className='interview-card__body'>

                    {/* Left Panel - Job Description */}
                    <div className='panel panel--left'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="7" width="20" height="14" rx="2" ry="2" /><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" /></svg>
                            </span>
                            <h2>Target Job Description</h2>
                            <span className='badge badge--required'>Required</span>
                        </div>
                        <p className='panel__hint'>Paste the role requirements to generate targeted interview questions.</p>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => { setJobDescription(e.target.value) }}
                            className='panel__textarea'
                            placeholder={`Paste job description here...\ne.g. 'Senior Full Stack Engineer at Stripe requires proficiency in React, Node.js, distributed databases, and high-scale architecture...'`}
                            maxLength={5000}
                        />
                        <div className='char-counter'>{jobDescription.length} / 5000 chars</div>
                    </div>

                    {/* Vertical Divider */}
                    <div className='panel-divider' />

                    {/* Right Panel - Profile */}
                    <div className='panel panel--right'>
                        <div className='panel__header'>
                            <span className='panel__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                            </span>
                            <h2>Candidate Profile</h2>
                        </div>
                        <p className='panel__hint'>Provide your resume or background for tailored evaluation.</p>

                        {/* Upload Resume */}
                        <div className='upload-section'>
                            <label className='section-label'>
                                Upload Resume
                                <span className='badge badge--best'>Best Results</span>
                            </label>
                            <label 
                                className={`dropzone ${isDragging ? 'dropzone--dragging' : ''} ${selectedFile ? 'dropzone--has-file' : ''}`} 
                                htmlFor='resume'
                                onDragOver={handleDragOver}
                                onDragLeave={handleDragLeave}
                                onDrop={handleDrop}
                            >
                                {selectedFile ? (
                                    <div className="dropzone__file-info">
                                        <div className="file-icon-badge">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
                                        </div>
                                        <div className="file-text-details">
                                            <p className="file-name">{selectedFile.name}</p>
                                            <p className="file-size">{(selectedFile.size / 1024).toFixed(1)} KB &bull; PDF</p>
                                        </div>
                                        <button className="remove-file-btn" onClick={handleRemoveFile} title="Remove file">
                                            ✕
                                        </button>
                                    </div>
                                ) : (
                                    <>
                                        <span className='dropzone__icon'>
                                            <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 16 12 12 8 16" /><line x1="12" y1="12" x2="12" y2="21" /><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3" /></svg>
                                        </span>
                                        <p className='dropzone__title'>Click to upload or drag &amp; drop</p>
                                        <p className='dropzone__subtitle'>PDF Document (Max 5MB)</p>
                                    </>
                                )}
                                <input 
                                    ref={resumeInputRef} 
                                    hidden 
                                    type='file' 
                                    id='resume' 
                                    name='resume' 
                                    accept='.pdf,application/pdf' 
                                    onChange={handleFileChange}
                                />
                            </label>
                        </div>

                        {/* OR Divider */}
                        <div className='or-divider'><span>OR</span></div>

                        {/* Quick Self-Description */}
                        <div className='self-description'>
                            <label className='section-label' htmlFor='selfDescription'>Quick Self-Description</label>
                            <textarea
                                value={selfDescription}
                                onChange={(e) => { setSelfDescription(e.target.value) }}
                                id='selfDescription'
                                name='selfDescription'
                                className='panel__textarea panel__textarea--short'
                                placeholder="Summarize your experience, tech stack, and background if you don't have a resume PDF ready..."
                            />
                        </div>

                        {/* Info Box */}
                        <div className='info-box'>
                            <span className='info-box__icon'>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" stroke="#1a1f27" strokeWidth="2" /><line x1="12" y1="16" x2="12.01" y2="16" stroke="#1a1f27" strokeWidth="2" /></svg>
                            </span>
                            <p>Either a <strong>Resume PDF</strong> or a <strong>Self Description</strong> is needed to generate your interview plan.</p>
                        </div>
                    </div>
                </div>

                {/* Card Footer */}
                <div className='interview-card__footer'>
                    <span className='footer-info'>⚡ Real-Time AI Generation &bull; Questions, Scoring &amp; Prep Plan</span>
                    <button
                        onClick={handleGenerateReport}
                        className='generate-btn'>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" /></svg>
                        Generate Interview Plan
                    </button>
                </div>
            </div>

            {/* Saved Reports Section (Logged in users only) */}
            {user && reports && reports.length > 0 && (
                <section className='recent-reports'>
                    <div className='recent-reports__header'>
                        <h2>Your Saved Interview Plans</h2>
                        <span className='recent-reports__count'>{reports.length} saved</span>
                    </div>
                    <ul className='reports-list'>
                        {reports.map(rep => (
                            <li key={rep._id} className='report-item' onClick={() => navigate(`/interview/${rep._id}`)}>
                                <div className='report-item__top'>
                                    <h3>{rep.title || 'Target Position'}</h3>
                                    <span className={`match-score ${rep.matchScore >= 80 ? 'score--high' : rep.matchScore >= 60 ? 'score--mid' : 'score--low'}`}>
                                        {rep.matchScore}% Match
                                    </span>
                                </div>
                                <p className='report-meta'>Created on {new Date(rep.createdAt).toLocaleDateString()}</p>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* Page Footer */}
            <footer className='page-footer'>
                <div className='footer-brand'>🤖 <strong>AI Interviewer</strong></div>
                <p>&copy; {new Date().getFullYear()} AI Interviewer &bull; Interactive AI Technical &amp; Behavioral Mock Interviews</p>
            </footer>
        </div>
    )
}

export default Home
