import React, { useState } from 'react'
import { useNavigate, Link } from 'react-router'
import "../auth.form.scss"
import { useAuth } from '../hooks/useAuth'

const Login = () => {
    const { handleLogin } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        setError("")
        if (!email.trim() || !password.trim()) {
            setError("Please enter both email and password")
            return
        }
        setSubmitting(true)
        const res = await handleLogin({ email, password })
        setSubmitting(false)
        if (res && res.success) {
            navigate('/')
        } else {
            setError(res?.error || "Login failed. Please check your credentials.")
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

                <h1>Welcome Back</h1>

                {error && (
                    <div className="auth-error-banner">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                        <span>{error}</span>
                    </div>
                )}

                <form onSubmit={handleSubmit}>
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
                        <label htmlFor="password">Password</label>
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
                        {submitting ? "Signing in..." : "Sign In"}
                    </button>
                </form>

                <p className="auth-footer-text">Don't have an account? <Link to={"/register"}>Create an account</Link></p>
            </div>
        </main>
    )
}

export default Login