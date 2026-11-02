import React, { useRef, useState } from 'react'
import { useNavigate, Link } from 'react-router'
import { Eye, EyeOff } from 'lucide-react'
import "../style/auth.form.scss"
import { useAuth } from '../hooks/useAuth'
import Loader from '../../../components/common/Loader'

const Login = () => {

    const { initializing, handleLogin } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [showPassword, setShowPassword] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const submitLock = useRef(false)

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (submitLock.current) return

        submitLock.current = true
        setSubmitting(true)
        try {
            await handleLogin({ email, password })
            navigate('/')
        } finally {
            submitLock.current = false
            setSubmitting(false)
        }
    }

    if (initializing) {
        return <Loader message="Checking your session..." variant="fullscreen" />
    }

    return (
        <main>
            <div className="form-container">
                <h1>Login</h1>

                <form onSubmit={handleSubmit}>

                    <div className="input-group">
                        <label htmlFor="email">Email</label>
                        <input
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            type="email"
                            id="email"
                            name="email"
                            placeholder="Enter email address"
                            required
                        />
                    </div>

                    <div className="input-group">
                        <label htmlFor="password">Password</label>

                        <div className="password-field">
                            <input
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                type={showPassword ? "text" : "password"}
                                id="password"
                                name="password"
                                placeholder="Enter password"
                                required
                            />

                            <button
                                type="button"
                                onClick={() => setShowPassword(prev => !prev)}
                                aria-label={showPassword ? "Hide password" : "Show password"}
                            >
                                {showPassword ? <EyeOff /> : <Eye />}
                            </button>
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="button primary-button auth-submit"
                        disabled={submitting}
                        aria-busy={submitting}
                    >
                        {submitting
                            ? <Loader variant="inline" message="Logging in..." />
                            : "Login"}
                    </button>

                </form>

                <p>
                    Don't have an account?
                    <Link to="/register"> Register</Link>
                </p>
            </div>
        </main>
    )
}

export default Login