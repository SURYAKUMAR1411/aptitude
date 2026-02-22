import { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { CATEGORIES, TOPICS, getTopicById } from '../../data/topicConfig';

const TopicsPage = () => {
    const [searchParams] = useSearchParams();
    const initialCategory = searchParams.get('category') || 'all';
    const [activeCategory, setActiveCategory] = useState(initialCategory);
    const { profile } = useAuth();
    const navigate = useNavigate();

    const displayTopics = useMemo(() => {
        if (activeCategory === 'all') {
            return CATEGORIES.map(cat => ({
                ...cat,
                topics: TOPICS[cat.id] || [],
            }));
        }
        const cat = CATEGORIES.find(c => c.id === activeCategory);
        if (!cat) return [];
        return [{ ...cat, topics: TOPICS[cat.id] || [] }];
    }, [activeCategory]);

    const isUnlocked = (topicId) => {
        return profile?.unlockedTopics?.includes(topicId) || false;
    };

    const getMastery = (topicId) => {
        return profile?.topicMastery?.[topicId]?.mastery || 0;
    };

    const handleTopicClick = (topic, catId) => {
        if (!isUnlocked(topic.id)) return;
        navigate(`/practice/${topic.id}`);
    };

    const stagger = {
        hidden: {},
        show: { transition: { staggerChildren: 0.05 } },
    };

    const fadeUp = {
        hidden: { opacity: 0, y: 12 },
        show: { opacity: 1, y: 0 },
    };

    return (
        <div>
            <div className="page-header">
                <h1>Topics</h1>
                <p>Choose a topic to start learning. Complete topics to unlock more.</p>
            </div>

            {/* Category Tabs */}
            <div className="category-tabs">
                <button
                    className={`category-tab ${activeCategory === 'all' ? 'active' : ''}`}
                    onClick={() => setActiveCategory('all')}
                >
                    📋 All Topics
                </button>
                {CATEGORIES.map(cat => (
                    <button
                        key={cat.id}
                        className={`category-tab ${activeCategory === cat.id ? 'active' : ''}`}
                        onClick={() => setActiveCategory(cat.id)}
                    >
                        {cat.icon} {cat.shortName}
                    </button>
                ))}
            </div>

            {/* Topics Grid by Category */}
            {displayTopics.map(category => (
                <div key={category.id} style={{ marginBottom: 'var(--space-10)' }}>
                    <div style={{
                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                        marginBottom: 'var(--space-5)', paddingBottom: 'var(--space-3)',
                        borderBottom: '2px solid var(--border-light)',
                    }}>
                        <span style={{ fontSize: '1.5rem' }}>{category.icon}</span>
                        <div>
                            <h2 style={{ fontSize: '1.25rem' }}>{category.name}</h2>
                            <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>{category.description}</p>
                        </div>
                    </div>

                    <motion.div className="topic-grid" variants={stagger} initial="hidden" animate="show">
                        {category.topics.map(topic => {
                            const unlocked = isUnlocked(topic.id);
                            const mastery = getMastery(topic.id);
                            const catClass = category.id === 'quantitative' ? 'quant' :
                                category.id === 'logical' ? 'logical' : 'verbal';

                            return (
                                <motion.div
                                    key={topic.id}
                                    className={`topic-card ${catClass} ${!unlocked ? 'topic-card-locked' : ''}`}
                                    variants={fadeUp}
                                    onClick={() => handleTopicClick(topic, category.id)}
                                    whileHover={unlocked ? { y: -3 } : {}}
                                >
                                    <div className="topic-card-indicator" />
                                    {!unlocked && <span className="topic-card-lock">🔒</span>}
                                    <div className="topic-card-icon">{topic.icon}</div>
                                    <div className="topic-card-name">{topic.name}</div>
                                    <div className="topic-card-desc">{topic.description}</div>
                                    <div className="topic-card-mastery">
                                        <span>Mastery</span>
                                        <span style={{ fontWeight: 600 }}>{mastery}%</span>
                                    </div>
                                    <div className="progress-bar">
                                        <div className="progress-fill" style={{
                                            width: `${mastery}%`,
                                            background: catClass === 'quant' ? 'var(--quant-primary)' :
                                                catClass === 'logical' ? 'var(--logical-primary)' : 'var(--verbal-primary)'
                                        }} />
                                    </div>
                                    {topic.interactive && (
                                        <div style={{
                                            marginTop: 'var(--space-3)', fontSize: '0.6875rem',
                                            color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4,
                                        }}>
                                            🎯 Interactive: {topic.interactive.replace('-', ' ')}
                                        </div>
                                    )}
                                </motion.div>
                            );
                        })}
                    </motion.div>
                </div>
            ))}
        </div>
    );
};

export default TopicsPage;
