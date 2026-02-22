import { useState, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { calculateLevel } from '../../services/adaptiveEngine';

const Sidebar = ({ isOpen, onClose }) => {
    const { profile, logout, isDemo } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const levelInfo = calculateLevel(profile?.xp || 0);

    const handleLogout = async () => {
        await logout();
        navigate('/login');
    };

    // Close sidebar on route change (mobile)
    useEffect(() => { onClose(); }, [location.pathname]);

    return (
        <>
            {/* Mobile Overlay */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        className="sidebar-overlay"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />
                )}
            </AnimatePresence>

            <aside className={`app-sidebar ${isOpen ? 'open' : ''}`}>
                {/* Logo + Mobile Close */}
                <div className="sidebar-logo">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <h2>
                            <span className="logo-icon">🎓</span>
                            PlacePrep
                        </h2>
                        <button className="sidebar-close-btn" onClick={onClose}>✕</button>
                    </div>
                    <p>Placement Preparation Platform</p>
                </div>

                <nav className="sidebar-nav">
                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Main</div>
                        <NavLink to="/dashboard" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            <span className="link-icon">📊</span>
                            Dashboard
                        </NavLink>
                        <NavLink to="/topics" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            <span className="link-icon">📚</span>
                            Topics
                        </NavLink>
                        <NavLink to="/battle" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
                            <span className="link-icon">⚔️</span>
                            Battle
                        </NavLink>
                    </div>

                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Categories</div>
                        <NavLink to="/topics?category=quantitative" className="sidebar-link">
                            <span className="link-icon">📐</span>
                            Quantitative
                        </NavLink>
                        <NavLink to="/topics?category=logical" className="sidebar-link">
                            <span className="link-icon">🧩</span>
                            Logical Reasoning
                        </NavLink>
                        <NavLink to="/topics?category=verbal" className="sidebar-link">
                            <span className="link-icon">📝</span>
                            Verbal Ability
                        </NavLink>
                    </div>

                    <div className="sidebar-section">
                        <div className="sidebar-section-title">Profile</div>
                        <div style={{ padding: '0 12px' }}>
                            <div className="sidebar-profile-card">
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                                    <div className="sidebar-avatar">
                                        {(profile?.name || 'D')[0].toUpperCase()}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '0.8125rem', fontWeight: 600 }}>{profile?.name || 'Demo User'}</div>
                                        <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                            {isDemo ? 'Demo Mode' : profile?.email}
                                        </div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', marginBottom: '8px' }}>
                                    <div>
                                        <span style={{ color: 'var(--text-muted)' }}>Level </span>
                                        <span style={{ fontWeight: 700, color: 'var(--quant-primary)' }}>{levelInfo.level}</span>
                                    </div>
                                    <div>
                                        <span style={{ color: 'var(--text-muted)' }}>XP </span>
                                        <span style={{ fontWeight: 700, color: 'var(--xp-gold)' }}>{profile?.xp || 0}</span>
                                    </div>
                                </div>
                                <div className="progress-bar" style={{ height: 4 }}>
                                    <div className="progress-fill" style={{
                                        width: `${levelInfo.progress}%`,
                                        background: 'linear-gradient(90deg, var(--quant-primary), var(--quant-secondary))',
                                    }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </nav>

                <div className="sidebar-footer">
                    <button className="btn btn-ghost btn-full" onClick={handleLogout} style={{ justifyContent: 'flex-start' }}>
                        🚪 {isDemo ? 'Exit Demo' : 'Sign Out'}
                    </button>
                </div>
            </aside>
        </>
    );
};

const Header = ({ onMenuToggle }) => {
    const { profile } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const isDashboard = location.pathname === '/dashboard';

    return (
        <header className="app-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <button className="hamburger-btn" onClick={onMenuToggle}>
                    <span></span><span></span><span></span>
                </button>
                {!isDashboard && (
                    <button className="btn btn-ghost back-btn" onClick={() => navigate(-1)}>
                        ← Back
                    </button>
                )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {profile?.streak > 0 && (
                    <div className="header-badge streak">🔥 {profile.streak}</div>
                )}
                <div className="header-badge xp">⭐ {profile?.xp || 0} XP</div>
            </div>
        </header>
    );
};

const AppLayout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Prevent body scroll when sidebar is open on mobile
    useEffect(() => {
        if (sidebarOpen) document.body.style.overflow = 'hidden';
        else document.body.style.overflow = '';
        return () => { document.body.style.overflow = ''; };
    }, [sidebarOpen]);

    return (
        <div className="app-layout">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
            <main className="app-main">
                <Header onMenuToggle={() => setSidebarOpen(prev => !prev)} />
                <div className="app-content">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={window.location.pathname}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            transition={{ duration: 0.2 }}
                        >
                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </main>
        </div>
    );
};

export default AppLayout;
