import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { registerUser, loginUser, resetPassword } from '../../services/authService';

export const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const { loginAsDemo } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await loginUser(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message?.includes('auth/') ? 'Invalid email or password. Please try again.' : err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleDemo = () => {
        loginAsDemo();
        navigate('/dashboard');
    };

    return (
        <div className="auth-page">
            <motion.div
                className="auth-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="auth-header">
                    <div className="auth-logo">🎓</div>
                    <h1>Welcome Back</h1>
                    <p>Sign in to continue your placement preparation</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{
                            background: '#FDECEC', border: '1px solid #F5C6CB',
                            borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
                            fontSize: '0.8125rem', color: 'var(--error)', marginBottom: 'var(--space-5)',
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="login-email">Email Address</label>
                        <input
                            id="login-email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="login-password">Password</label>
                        <input
                            id="login-password"
                            type="password"
                            className="form-input"
                            placeholder="Enter your password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ textAlign: 'right', marginBottom: 'var(--space-5)' }}>
                        <Link to="/reset-password" style={{ fontSize: '0.8125rem', color: 'var(--quant-secondary)' }}>
                            Forgot password?
                        </Link>
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                        {loading ? 'Signing in...' : 'Sign In'}
                    </button>
                </form>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                    margin: 'var(--space-6) 0', color: 'var(--text-muted)', fontSize: '0.8125rem'
                }}>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
                    <span>or</span>
                    <div style={{ flex: 1, height: 1, background: 'var(--border-light)' }} />
                </div>

                <button className="btn btn-secondary btn-lg btn-full" onClick={handleDemo}>
                    🎮 Try Demo Mode
                </button>

                <div className="auth-footer">
                    Don't have an account? <Link to="/register">Create one</Link>
                </div>
            </motion.div>
        </div>
    );
};

export const RegisterPage = () => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }

        setLoading(true);
        try {
            await registerUser(email, password, name);
            navigate('/dashboard');
        } catch (err) {
            setError(err.message?.includes('auth/email-already-in-use')
                ? 'This email is already registered.'
                : err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <motion.div
                className="auth-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="auth-header">
                    <div className="auth-logo">🎓</div>
                    <h1>Create Account</h1>
                    <p>Start your placement preparation journey</p>
                </div>

                <form onSubmit={handleSubmit}>
                    {error && (
                        <div style={{
                            background: '#FDECEC', border: '1px solid #F5C6CB',
                            borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
                            fontSize: '0.8125rem', color: 'var(--error)', marginBottom: 'var(--space-5)',
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-name">Full Name</label>
                        <input
                            id="reg-name"
                            type="text"
                            className="form-input"
                            placeholder="Your full name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-email">Email Address</label>
                        <input
                            id="reg-email"
                            type="email"
                            className="form-input"
                            placeholder="you@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-password">Password</label>
                        <input
                            id="reg-password"
                            type="password"
                            className="form-input"
                            placeholder="Min. 6 characters"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label className="form-label" htmlFor="reg-confirm">Confirm Password</label>
                        <input
                            id="reg-confirm"
                            type="password"
                            className="form-input"
                            placeholder="Re-enter your password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                        {loading ? 'Creating Account...' : 'Create Account'}
                    </button>
                </form>

                <div className="auth-footer">
                    Already have an account? <Link to="/login">Sign in</Link>
                </div>
            </motion.div>
        </div>
    );
};

export const ResetPasswordPage = () => {
    const [email, setEmail] = useState('');
    const [sent, setSent] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            await resetPassword(email);
            setSent(true);
        } catch (err) {
            setError(err.message || 'Failed to send reset email. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <motion.div
                className="auth-container"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
            >
                <div className="auth-header">
                    <div className="auth-logo">🔑</div>
                    <h1>Reset Password</h1>
                    <p>We'll send you a link to reset your password</p>
                </div>

                {sent ? (
                    <div style={{
                        background: '#EAFAF1', border: '1px solid #27AE60',
                        borderRadius: 'var(--radius-md)', padding: 'var(--space-5)',
                        textAlign: 'center',
                    }}>
                        <p style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--success)', marginBottom: '8px' }}>
                            ✅ Email Sent!
                        </p>
                        <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                            Check your inbox for a password reset link.
                        </p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div style={{
                                background: '#FDECEC', border: '1px solid #F5C6CB',
                                borderRadius: 'var(--radius-md)', padding: 'var(--space-3) var(--space-4)',
                                fontSize: '0.8125rem', color: 'var(--error)', marginBottom: 'var(--space-5)',
                            }}>
                                {error}
                            </div>
                        )}

                        <div className="form-group">
                            <label className="form-label" htmlFor="reset-email">Email Address</label>
                            <input
                                id="reset-email"
                                type="email"
                                className="form-input"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>

                        <button type="submit" className="btn btn-primary btn-lg btn-full" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Reset Link'}
                        </button>
                    </form>
                )}

                <div className="auth-footer">
                    <Link to="/login">← Back to Sign In</Link>
                </div>
            </motion.div>
        </div>
    );
};
