import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Register = () => {
    const navigate = useNavigate()
    const [username, setUsername] = useState("")
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const { handleRegister } = useAuth()

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        if (!username.trim() || !email.trim() || !password.trim()) {
            setError("All fields are required")
            return
        }
        if (password.length < 6) {
            setError("Password must be at least 6 characters")
            return
        }
        setSubmitting(true)
        const res = await handleRegister({ username, email, password })
        setSubmitting(false)
        if (res && res.success) {
            navigate("/")
        } else {
            setError(res?.error || "Registration failed. Please try again.")
        }
    }

    return (
        <main className="auth-main">
            <div className="form-container">
                <div className="brand-header">
                    <span className="brand-logo">🤖</span>
                    <h2>AI Interviewer</h2>
                    <p className="brand-subtitle">Prepare, practice, and ace your dream job interview.</p>
                </div>

                <h1>Create Account</h1>

                {error && (
                    <div className="auth-error-banner">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div className="input-group">
                        <label htmlFor="username">Full Name / Username</label>
                        <input
                            value={username}
                            onChange={(e) => { setUsername(e.target.value) }}
                            type="text" 
                            id="username" 
                            name='username' 
                            placeholder='Alex Rivera' 
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="email">Email Address</label>
                        <input
                            value={email}
                            onChange={(e) => { setEmail(e.target.value) }}
                            type="email" 
                            id="email" 
                            name='email' 
                            placeholder='name@company.com' 
                            required 
                        />
                    </div>
                    <div className="input-group">
                        <label htmlFor="password">Password (min 6 characters)</label>
                        <input
                            value={password}
                            onChange={(e) => { setPassword(e.target.value) }}
                            type="password" 
                            id="password" 
                            name='password' 
                            placeholder='••••••••' 
                            required 
                        />
                    </div>

                    <button className='button primary-button auth-btn' disabled={submitting}>
                        {submitting ? "Creating account..." : "Create Account"}
                    </button>
                </form>

                <p className="auth-footer-text">Already have an account? <Link to={"/login"}>Sign In</Link></p>
            </div>
        </main>
    )
}

export default Register