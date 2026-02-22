import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { calculateLevel } from '../../services/adaptiveEngine';
import { getReadinessLevel } from '../../services/readinessEngine';
import { CATEGORIES, ALL_TOPICS, TOPICS } from '../../data/topicConfig';

const ReadinessRing = ({ score }) => {
    const readiness = getReadinessLevel(score);
    const radius = 68;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (score / 100) * circumference;

    return (
        <div className="readiness-score-ring">
            <svg viewBox="0 0 160 160" style={{ width: '100%', height: '100%' }}>
                <circle cx="80" cy="80" r={radius} fill="none" stroke="var(--neutral-200)" strokeWidth="8" />
                <motion.circle
                    cx="80" cy="80" r={radius} fill="none"
                    stroke={readiness.color}
                    strokeWidth="8"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    initial={{ strokeDashoffset: circumference }}
                    animate={{ strokeDashoffset: dashOffset }}
                    transition={{ duration: 1.5, ease: 'easeOut' }}
                />
            </svg>
            <div className="readiness-score-value">
                {score}<span>%</span>
            </div>
        </div>
    );
};

const Dashboard = () => {
    const { profile } = useAuth();
    const navigate = useNavigate();

    const levelInfo = calculateLevel(profile?.xp || 0);
    const readiness = getReadinessLevel(profile?.readinessScore || 0);

    const recentTopics = useMemo(() => {
        if (!profile?.topicMastery) return [];
        return Object.entries(profile.topicMastery)
            .filter(([, m]) => m.lastPracticed)
            .sort((a, b) => new Date(b[1].lastPracticed) - new Date(a[1].lastPracticed))
            .slice(0, 5)
            .map(([id, mastery]) => {
                const topic = ALL_TOPICS.find(t => t.id === id);
                return topic ? { ...topic, mastery } : null;
            })
            .filter(Boolean);
    }, [profile?.topicMastery]);

    const topicStats = useMemo(() => {
        const total = ALL_TOPICS.length;
        const unlocked = profile?.unlockedTopics?.length || 0;
        const practiced = Object.keys(profile?.topicMastery || {}).filter(
            k => (profile.topicMastery[k]?.attempts || 0) > 0
        ).length;
        return { total, unlocked, practiced };
    }, [profile]);

    const staggerChildren = {
        hidden: { opacity: 0 },
        show: { opacity: 1, transition: { staggerChildren: 0.1 } },
    };
    const fadeUp = {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0, transition: { duration: 0.3 } },
    };

    return (
        <div>
            <div className="page-header">
                <h1>Dashboard</h1>
                <p>Welcome back, {profile?.name || 'Student'}! Track your placement preparation progress.</p>
            </div>

            {/* Stats Grid */}
            <motion.div className="stat-grid" variants={staggerChildren} initial="hidden" animate="show">
                <motion.div className="stat-card" variants={fadeUp}>
                    <div className="stat-icon" style={{ background: 'var(--quant-bg)', color: 'var(--quant-primary)' }}>⭐</div>
                    <div className="stat-content">
                        <div className="stat-label">Total XP</div>
                        <div className="stat-value">{profile?.xp || 0}</div>
                        <div className="stat-sub">Level {levelInfo.level} — {Math.round(levelInfo.progress)}% to next</div>
                    </div>
                </motion.div>

                <motion.div className="stat-card" variants={fadeUp}>
                    <div className="stat-icon" style={{ background: '#FFF3E0', color: 'var(--xp-streak)' }}>🔥</div>
                    <div className="stat-content">
                        <div className="stat-label">Streak</div>
                        <div className="stat-value">{profile?.streak || 0} days</div>
                        <div className="stat-sub">Keep practicing daily!</div>
                    </div>
                </motion.div>

                <motion.div className="stat-card" variants={fadeUp}>
                    <div className="stat-icon" style={{ background: 'var(--logical-bg)', color: 'var(--logical-primary)' }}>📊</div>
                    <div className="stat-content">
                        <div className="stat-label">Level</div>
                        <div className="stat-value">{levelInfo.level}</div>
                        <div className="progress-bar" style={{ marginTop: 6 }}>
                            <div className="progress-fill" style={{
                                width: `${levelInfo.progress}%`,
                                background: 'linear-gradient(90deg, var(--quant-primary), var(--quant-secondary))',
                            }} />
                        </div>
                    </div>
                </motion.div>

                <motion.div className="stat-card" variants={fadeUp}>
                    <div className="stat-icon" style={{ background: 'var(--verbal-bg)', color: 'var(--verbal-primary)' }}>📚</div>
                    <div className="stat-content">
                        <div className="stat-label">Topics</div>
                        <div className="stat-value">{topicStats.practiced}/{topicStats.total}</div>
                        <div className="stat-sub">{topicStats.unlocked} unlocked</div>
                    </div>
                </motion.div>
            </motion.div>

            {/* Readiness + Daily Challenge Row */}
            <div className="dashboard-two-col">
                <motion.div
                    className="readiness-card"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 }}
                >
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>Placement Readiness</h3>
                    <ReadinessRing score={profile?.readinessScore || 0} />
                    <div className="readiness-label" style={{ color: readiness.color }}>
                        {readiness.icon} {readiness.label}
                    </div>
                    <div className="readiness-sublabel">
                        Your Placement Readiness: {profile?.readinessScore || 0}%
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}
                >
                    <div className="daily-challenge">
                        <h3>🏆 Daily Challenge</h3>
                        <p>Complete today's mixed-topic challenge to earn bonus XP and maintain your streak!</p>
                        <button className="btn" onClick={() => navigate('/topics')}>
                            Start Challenge →
                        </button>
                    </div>

                    <div className="card card-padding" style={{ flex: 1 }}>
                        <h4 style={{ marginBottom: 'var(--space-3)', fontSize: '0.875rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Category Progress
                        </h4>
                        {CATEGORIES.map(cat => {
                            const catTopics = TOPICS[cat.id] || [];
                            const catMastery = catTopics.reduce((sum, t) => {
                                return sum + (profile?.topicMastery?.[t.id]?.mastery || 0);
                            }, 0) / (catTopics.length || 1);

                            const colorVar = cat.id === 'quantitative' ? 'var(--quant-primary)' :
                                cat.id === 'logical' ? 'var(--logical-primary)' : 'var(--verbal-primary)';

                            return (
                                <div key={cat.id} style={{ marginBottom: 'var(--space-3)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: 4 }}>
                                        <span>{cat.icon} {cat.shortName}</span>
                                        <span style={{ color: 'var(--text-muted)' }}>{Math.round(catMastery)}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{ width: `${catMastery}%`, background: colorVar }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </motion.div>
            </div>

            {/* Topic Mastery Bars */}
            <motion.div
                className="card card-padding"
                style={{ marginTop: 'var(--space-6)' }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
            >
                <h3 style={{ marginBottom: 'var(--space-5)' }}>Topic Mastery</h3>
                <div className="topic-mastery-grid">
                    {ALL_TOPICS.slice(0, 10).map(topic => {
                        const mastery = profile?.topicMastery?.[topic.id]?.mastery || 0;
                        const isUnlocked = profile?.unlockedTopics?.includes(topic.id);
                        const catClass = topic.category === 'quantitative' ? 'quant' :
                            topic.category === 'logical' ? 'logical' : 'verbal';

                        return (
                            <div
                                key={topic.id}
                                className={`mastery-box ${!isUnlocked ? 'locked' : ''}`}
                                onClick={() => isUnlocked && navigate(`/practice/${topic.id}`)}
                            >
                                <div className={`mastery-box-indicator ${catClass}`} />
                                <div className="mastery-box-header">
                                    <span className="mastery-box-icon">{topic.icon}</span>
                                    {!isUnlocked && <span className="mastery-box-lock">🔒</span>}
                                </div>
                                <div className="mastery-box-name">{topic.name}</div>
                                <div className="mastery-box-value">{mastery}%</div>
                                <div className="progress-bar" style={{ height: 4 }}>
                                    <div className="progress-fill" style={{
                                        width: `${mastery}%`,
                                        background: catClass === 'quant' ? 'var(--quant-primary)' :
                                            catClass === 'logical' ? 'var(--logical-primary)' : 'var(--verbal-primary)'
                                    }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </motion.div>

            {/* Recently Practiced */}
            {recentTopics.length > 0 && (
                <motion.div
                    className="card card-padding"
                    style={{ marginTop: 'var(--space-6)' }}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                >
                    <h3 style={{ marginBottom: 'var(--space-4)' }}>Recently Practiced</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {recentTopics.map(topic => (
                            <div
                                key={topic.id}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                    padding: 'var(--space-3) var(--space-4)',
                                    background: 'var(--neutral-50)',
                                    borderRadius: 'var(--radius-md)',
                                    cursor: 'pointer',
                                }}
                                onClick={() => navigate(`/practice/${topic.id}`)}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <span style={{ fontSize: '1.25rem' }}>{topic.icon}</span>
                                    <div>
                                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{topic.name}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                            Accuracy: {topic.mastery?.accuracy || 0}% · {topic.mastery?.attempts || 0} attempts
                                        </div>
                                    </div>
                                </div>
                                <button className="btn btn-sm btn-secondary" onClick={(e) => { e.stopPropagation(); navigate(`/practice/${topic.id}`); }}>
                                    Practice →
                                </button>
                            </div>
                        ))}
                    </div>
                </motion.div>
            )}
        </div>
    );
};

export default Dashboard;
