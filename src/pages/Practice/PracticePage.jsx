import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { getQuestions } from '../../services/questionService';
import { AdaptiveEngine } from '../../services/adaptiveEngine';
import { getTopicById, DIFFICULTY_CONFIG, MODE_UNLOCK_REQUIREMENTS, ALL_TOPICS } from '../../data/topicConfig';
import ParaJumbleQuestion from '../../components/questionTypes/ParaJumbleQuestion';

// ---- DIFFICULTY SELECTION ----
const DifficultySelector = ({ topic, onSelect, topicMastery }) => {
    const mastery = topicMastery || 0;
    const navigate = useNavigate();

    const getCategoryColor = () => {
        const t = getTopicById(topic.id);
        if (!t) return 'var(--quant-primary)';
        if (t.category === 'quantitative') return 'var(--quant-primary)';
        if (t.category === 'logical') return 'var(--logical-primary)';
        return 'var(--verbal-primary)';
    };

    return (
        <div>
            <div className="page-breadcrumb">
                <Link to="/topics">Topics</Link>
                <span>›</span>
                <span>{topic.name}</span>
            </div>

            <div className="page-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    <span style={{ fontSize: '2.5rem' }}>{topic.icon}</span>
                    <div>
                        <h1>{topic.name}</h1>
                        <p>{topic.description}</p>
                    </div>
                </div>
            </div>

            <div className="difficulty-grid">
                {Object.entries(DIFFICULTY_CONFIG).map(([key, config]) => {
                    const req = MODE_UNLOCK_REQUIREMENTS[key];
                    const isLocked = mastery < req.minMastery && key !== 'basic';

                    return (
                        <motion.div
                            key={key}
                            className={`difficulty-card ${isLocked ? 'locked' : ''}`}
                            onClick={() => !isLocked && onSelect(key)}
                            whileHover={!isLocked ? { scale: 1.02 } : {}}
                            whileTap={!isLocked ? { scale: 0.98 } : {}}
                        >
                            <div className="difficulty-icon">{config.icon}</div>
                            <div className="difficulty-label">{config.label}</div>
                            <div className="difficulty-subtitle">{config.subtitle}</div>
                            <div className="difficulty-desc">{config.description}</div>

                            {isLocked && (
                                <div style={{
                                    marginTop: 'var(--space-3)', fontSize: '0.75rem',
                                    color: 'var(--text-muted)', fontStyle: 'italic',
                                }}>
                                    🔒 Requires {req.minMastery}% mastery
                                </div>
                            )}

                            {!isLocked && (
                                <div style={{
                                    marginTop: 'var(--space-4)', fontSize: '0.8125rem',
                                    fontWeight: 600, color: getCategoryColor(),
                                }}>
                                    Start {config.label} →
                                </div>
                            )}
                        </motion.div>
                    );
                })}
            </div>

            <div style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                <button className="btn btn-ghost" onClick={() => navigate('/topics')}>
                    ← Back to Topics
                </button>
            </div>
        </div>
    );
};

// ---- CONCEPT PANEL ----
const ConceptPanel = ({ topic }) => {
    const concepts = {
        'percentage': {
            title: '📘 Understanding Percentages',
            content: 'A percentage is a fraction of 100. It represents a part of a whole expressed as a number out of 100.',
            formula: 'Percentage = (Part / Whole) × 100',
            steps: [
                'Identify what is the "part" and what is the "whole"',
                'Divide the part by the whole',
                'Multiply the result by 100 to get the percentage',
            ],
        },
        'profit-and-loss': {
            title: '📘 Profit & Loss Basics',
            content: 'Profit occurs when Selling Price (SP) > Cost Price (CP). Loss occurs when CP > SP.',
            formula: 'Profit% = [(SP - CP) / CP] × 100',
            steps: [
                'Identify Cost Price (CP) and Selling Price (SP)',
                'If SP > CP → Profit. If CP > SP → Loss',
                'Calculate profit/loss amount = |SP - CP|',
                'Calculate percentage on CP, not SP',
            ],
        },
        'ratio-and-proportion': {
            title: '📘 Ratio & Proportion',
            content: 'A ratio compares two quantities. A proportion states that two ratios are equal.',
            formula: 'If a:b = c:d, then a×d = b×c (cross multiplication)',
            steps: [
                'Express the comparison as a:b',
                'Simplify by dividing both by their GCD',
                'For division problems: Each part = Total ÷ Sum of ratio terms',
            ],
        },
    };

    const concept = concepts[topic.id] || {
        title: `📘 Understanding ${topic.name}`,
        content: `Learn the fundamentals of ${topic.name} with step-by-step explanations.`,
        formula: 'Practice makes perfect!',
        steps: ['Read the question carefully', 'Identify the key information', 'Apply the relevant formula', 'Verify your answer'],
    };

    return (
        <div className="concept-panel">
            <h3>{concept.title}</h3>
            <p>{concept.content}</p>
            <div className="concept-visual">
                <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1rem', color: 'var(--quant-primary)' }}>
                    {concept.formula}
                </strong>
            </div>
            <div>
                <div style={{ fontSize: '0.8125rem', fontWeight: 600, marginBottom: 'var(--space-2)', color: 'var(--text-muted)' }}>
                    STEP-BY-STEP APPROACH
                </div>
                {concept.steps.map((step, i) => (
                    <div key={i} className="concept-step">
                        <div className="concept-step-number">{i + 1}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>{step}</div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ---- QUIZ TIMER ----
const QuizTimer = ({ seconds, total }) => {
    const pct = (seconds / total) * 100;
    const cls = pct < 20 ? 'danger' : pct < 40 ? 'warning' : '';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;

    return (
        <div className={`quiz-timer ${cls}`}>
            ⏱ {mins}:{secs.toString().padStart(2, '0')}
        </div>
    );
};

// ---- MAIN PRACTICE PAGE ----
const PracticePage = () => {
    const { topicId } = useParams();
    const navigate = useNavigate();
    const { profile, addXP, updateTopicMastery } = useAuth();

    const [difficulty, setDifficulty] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [currentQ, setCurrentQ] = useState(0);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [showResult, setShowResult] = useState(false);
    const [showExplanation, setShowExplanation] = useState(false);
    const [timer, setTimer] = useState(0);
    const [totalTimer, setTotalTimer] = useState(0);
    const [loading, setLoading] = useState(false);
    const [sessionComplete, setSessionComplete] = useState(false);
    const [sessionStats, setSessionStats] = useState(null);
    const [xpEarned, setXpEarned] = useState(0);
    const [showLevelUp, setShowLevelUp] = useState(false);
    const [showHint, setShowHint] = useState(false);
    const [comboCount, setComboCount] = useState(0);
    const [isBossLevel, setIsBossLevel] = useState(false);

    const adaptiveRef = useRef(new AdaptiveEngine());
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);

    const topic = getTopicById(topicId);
    const topicMastery = profile?.topicMastery?.[topicId]?.mastery || 0;
    const config = DIFFICULTY_CONFIG[difficulty];

    // Load questions when difficulty is selected
    const handleSelectDifficulty = async (diff) => {
        setDifficulty(diff);
        setLoading(true);
        adaptiveRef.current.reset();
        adaptiveRef.current.currentDifficulty = diff;

        try {
            const qs = await getQuestions(topicId, diff, 10);
            if (qs.length === 0) {
                // Generate fallback questions
                const fallback = await getQuestions(topicId, 'basic', 10);
                setQuestions(fallback.length > 0 ? fallback : createFallbackQuestions(topic));
            } else {
                setQuestions(qs);
            }
        } catch (err) {
            console.error('Failed to load questions:', err);
            setQuestions(createFallbackQuestions(topic));
        }

        setCurrentQ(0);
        setSelectedAnswer(null);
        setShowResult(false);
        setXpEarned(0);
        setComboCount(0);
        setLoading(false);
    };

    // Always set start time when a new question appears
    useEffect(() => {
        if (difficulty && questions.length > 0 && !showResult && !sessionComplete) {
            startTimeRef.current = Date.now();

            if (config?.timerEnabled) {
                const timerVal = questions[currentQ]?.timerValue || 60;
                setTimer(timerVal);
                setTotalTimer(timerVal);

                timerRef.current = setInterval(() => {
                    setTimer(prev => {
                        if (prev <= 1) {
                            clearInterval(timerRef.current);
                            handleTimeUp();
                            return 0;
                        }
                        return prev - 1;
                    });
                }, 1000);

                return () => clearInterval(timerRef.current);
            }
        }
    }, [currentQ, difficulty, showResult, sessionComplete]);

    const handleTimeUp = () => {
        if (!showResult) {
            setShowResult(true);
            setShowExplanation(true);
            setComboCount(0);
            adaptiveRef.current.recordAnswer(false, 999, 60);
        }
    };

    const handleAnswerSelect = (answer) => {
        if (showResult) return;
        setSelectedAnswer(answer);
    };

    const handleSubmitAnswer = () => {
        if (selectedAnswer === null) return;

        clearInterval(timerRef.current);
        setShowResult(true);

        const question = questions[currentQ];
        const timeTaken = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 30;
        const isCorrect = selectedAnswer === question.correctAnswer;

        const result = adaptiveRef.current.recordAnswer(isCorrect, timeTaken, question.timerValue || 60);

        if (result.shouldShowHint) {
            setShowHint(true);
        }

        if (isCorrect) {
            const earnedXP = adaptiveRef.current.calculateXP(question.xpValue || 10, true, timeTaken, question.timerValue || 60);
            setXpEarned(prev => prev + earnedXP);
            setComboCount(prev => prev + 1);
            addXP(earnedXP);
        } else {
            setComboCount(0);
        }

        setShowExplanation(true);

        // Check if this is the last question
        if (currentQ === questions.length - 1) {
            // Boss level on advanced mode
            if (difficulty === 'advanced' && !isBossLevel) {
                setIsBossLevel(true);
            }
        }
    };

    const handleNextQuestion = () => {
        if (currentQ >= questions.length - 1) {
            finishSession();
            return;
        }

        setCurrentQ(prev => prev + 1);
        setSelectedAnswer(null);
        setShowResult(false);
        setShowExplanation(false);
        setShowHint(false);
    };

    const finishSession = async () => {
        clearInterval(timerRef.current);

        // Capture stats from the adaptive engine BEFORE setting state
        const stats = adaptiveRef.current.getStats();
        setSessionStats(stats);
        setSessionComplete(true);

        // Calculate new mastery (weighted: 60% old + 40% new accuracy)
        const currentMastery = profile?.topicMastery?.[topicId]?.mastery || 0;
        const newMastery = Math.min(100, Math.round(
            (currentMastery * 0.6) + (stats.accuracy * 0.4)
        ));

        try {
            await updateTopicMastery(topicId, {
                mastery: newMastery,
                accuracy: stats.accuracy,
                attempts: (profile?.topicMastery?.[topicId]?.attempts || 0) + 1,
                speedEfficiency: stats.speedEfficiency,
            });
            console.log(`Topic mastery updated: ${topicId} → ${newMastery}%, accuracy: ${stats.accuracy}%`);
        } catch (err) {
            console.warn('Failed to save mastery:', err.message);
        }
    };

    // Render
    if (!topic) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <h2>Topic not found</h2>
                <button className="btn btn-primary mt-4" onClick={() => navigate('/topics')}>
                    Back to Topics
                </button>
            </div>
        );
    }

    if (!difficulty) {
        return <DifficultySelector topic={topic} onSelect={handleSelectDifficulty} topicMastery={topicMastery} />;
    }

    if (loading) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ fontSize: '2rem', display: 'inline-block' }}
                >
                    ⏳
                </motion.div>
                <p style={{ marginTop: 'var(--space-4)', color: 'var(--text-secondary)' }}>
                    Loading questions...
                </p>
            </div>
        );
    }

    if (sessionComplete && sessionStats) {
        return <SessionResults
            stats={sessionStats}
            xpEarned={xpEarned}
            topic={topic}
            difficulty={difficulty}
            onRestart={() => {
                setDifficulty(null);
                setSessionComplete(false);
                setSessionStats(null);
                setQuestions([]);
                setCurrentQ(0);
                setXpEarned(0);
            }}
            onBackToTopics={() => navigate('/topics')}
        />;
    }

    const question = questions[currentQ];
    if (!question) {
        return (
            <div style={{ textAlign: 'center', padding: '4rem' }}>
                <h2>No questions available</h2>
                <button className="btn btn-primary mt-4" onClick={() => setDifficulty(null)}>
                    Try Different Difficulty
                </button>
            </div>
        );
    }

    const isParaJumble = question.type === 'reorder';

    return (
        <div className="quiz-container">
            <div className="page-breadcrumb">
                <Link to="/topics">Topics</Link>
                <span>›</span>
                <Link to={`/practice/${topicId}`} onClick={(e) => { e.preventDefault(); setDifficulty(null); }}>
                    {topic.name}
                </Link>
                <span>›</span>
                <span>{config.label} Mode</span>
            </div>

            {/* Boss Level Indicator */}
            {isBossLevel && currentQ === questions.length - 1 && (
                <motion.div
                    className="boss-level-indicator"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.5 }}
                >
                    <span className="boss-icon">👑</span>
                    <div>
                        <h3>Boss Level</h3>
                        <p>Final challenge question — prove your mastery!</p>
                    </div>
                </motion.div>
            )}

            {/* Quiz Header */}
            <div className="quiz-header">
                <div className="quiz-progress">
                    <span>Question {currentQ + 1} of {questions.length}</span>
                    <div className="progress-bar" style={{ width: 120 }}>
                        <div className="progress-fill" style={{
                            width: `${((currentQ + 1) / questions.length) * 100}%`,
                            background: 'var(--quant-primary)',
                        }} />
                    </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-4)' }}>
                    {comboCount >= 2 && (
                        <motion.div
                            className="streak-badge"
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            key={comboCount}
                        >
                            🔥 {comboCount}x Combo
                        </motion.div>
                    )}

                    {config.timerEnabled && !showResult && (
                        <QuizTimer seconds={timer} total={totalTimer} />
                    )}

                    <div className="xp-reward">⭐ +{xpEarned} XP</div>
                </div>
            </div>

            {/* Concept Panel for Basic Mode */}
            {difficulty === 'basic' && currentQ === 0 && <ConceptPanel topic={topic} />}

            {/* Question Card */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentQ}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                >
                    <div className="quiz-question-card">
                        <div className="quiz-question-number">
                            {config.icon} {config.label} · Question {currentQ + 1}
                            {question.difficulty && ` · ${question.difficulty}`}
                        </div>
                        <div className="quiz-question-text">{question.questionText}</div>

                        {isParaJumble ? (
                            <ParaJumbleQuestion
                                question={question}
                                onSubmit={(order) => {
                                    const isCorrect = JSON.stringify(order) === JSON.stringify(question.correctOrder);
                                    setSelectedAnswer(isCorrect ? question.correctAnswer || 'correct' : 'incorrect');
                                    // Auto-submit for reorder
                                    clearInterval(timerRef.current);
                                    setShowResult(true);
                                    const timeTaken = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 30;
                                    adaptiveRef.current.recordAnswer(isCorrect, timeTaken, question.timerValue || 90);
                                    if (isCorrect) {
                                        const earnedXP = adaptiveRef.current.calculateXP(question.xpValue || 15, true, timeTaken, question.timerValue || 90);
                                        setXpEarned(prev => prev + earnedXP);
                                        setComboCount(prev => prev + 1);
                                        addXP(earnedXP);
                                    } else {
                                        setComboCount(0);
                                    }
                                    setShowExplanation(true);
                                }}
                                showResult={showResult}
                                disabled={showResult}
                            />
                        ) : (
                            <div className="quiz-options">
                                {(question.options || []).map((option, idx) => {
                                    const letter = String.fromCharCode(65 + idx);
                                    let optClass = '';
                                    if (showResult) {
                                        if (option === question.correctAnswer) optClass = 'correct';
                                        else if (option === selectedAnswer) optClass = 'incorrect';
                                    } else if (option === selectedAnswer) {
                                        optClass = 'selected';
                                    }

                                    return (
                                        <div
                                            key={idx}
                                            className={`quiz-option ${optClass}`}
                                            onClick={() => handleAnswerSelect(option)}
                                        >
                                            <div className="quiz-option-marker">{letter}</div>
                                            <span>{option}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {/* Hint Panel */}
                    {(showHint || (difficulty === 'basic' && config.hintsEnabled)) && question.trickHint && !showResult && (
                        <motion.div
                            className="hint-panel"
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                        >
                            <div className="hint-label">💡 Hint</div>
                            <p style={{ fontSize: '0.875rem', color: '#5D4037' }}>{question.trickHint}</p>
                        </motion.div>
                    )}

                    {/* Explanation Panel */}
                    {showExplanation && (
                        <motion.div
                            className="explanation-panel"
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                        >
                            <div className="explanation-title">
                                {selectedAnswer === question.correctAnswer ? '✅ Correct!' : '❌ Incorrect'}
                            </div>
                            <div className="explanation-content">{question.explanation}</div>
                            {question.trickHint && (
                                <div style={{ marginTop: 'var(--space-3)', padding: 'var(--space-3)', background: '#FFF8E1', borderRadius: 'var(--radius-sm)' }}>
                                    <strong style={{ fontSize: '0.75rem', color: '#F9A825' }}>💡 TRICK:</strong>
                                    <span style={{ fontSize: '0.8125rem', color: '#5D4037', marginLeft: 8 }}>{question.trickHint}</span>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 'var(--space-5)' }}>
                        <button className="btn btn-ghost" onClick={() => setDifficulty(null)}>
                            ← Exit
                        </button>

                        {!showResult && !isParaJumble ? (
                            <button
                                className="btn btn-primary btn-lg"
                                onClick={handleSubmitAnswer}
                                disabled={selectedAnswer === null}
                            >
                                Submit Answer
                            </button>
                        ) : showResult ? (
                            <button className="btn btn-primary btn-lg" onClick={handleNextQuestion}>
                                {currentQ >= questions.length - 1 ? 'View Results' : 'Next Question →'}
                            </button>
                        ) : null}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

// ---- SESSION RESULTS ----
const SessionResults = ({ stats, xpEarned, topic, difficulty, onRestart, onBackToTopics }) => {
    const config = DIFFICULTY_CONFIG[difficulty];
    const accuracyColor = stats.accuracy >= 80 ? 'var(--success)' : stats.accuracy >= 50 ? 'var(--warning)' : 'var(--error)';

    const radius = 85;
    const circumference = 2 * Math.PI * radius;
    const dashOffset = circumference - (stats.accuracy / 100) * circumference;

    return (
        <div className="results-container">
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                <h1 style={{ marginBottom: 'var(--space-2)' }}>
                    {stats.accuracy >= 80 ? '🎉 Excellent!' : stats.accuracy >= 50 ? '👍 Good Job!' : '💪 Keep Practicing!'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
                    {topic.name} · {config.label} Mode · Session Complete
                </p>

                <div className="results-score-ring">
                    <svg viewBox="0 0 200 200" style={{ width: '100%', height: '100%' }}>
                        <circle cx="100" cy="100" r={radius} fill="none" stroke="var(--neutral-200)" strokeWidth="10" />
                        <motion.circle
                            cx="100" cy="100" r={radius} fill="none"
                            stroke={accuracyColor}
                            strokeWidth="10"
                            strokeLinecap="round"
                            strokeDasharray={circumference}
                            initial={{ strokeDashoffset: circumference }}
                            animate={{ strokeDashoffset: dashOffset }}
                            transition={{ duration: 1.5, ease: 'easeOut', delay: 0.3 }}
                            style={{ transform: 'rotate(-90deg)', transformOrigin: 'center' }}
                        />
                    </svg>
                    <div className="readiness-score-value">
                        {Math.round(stats.accuracy)}<span>%</span>
                    </div>
                </div>

                <div className="results-stats">
                    <div className="results-stat">
                        <div className="results-stat-value" style={{ color: 'var(--success)' }}>{stats.correct}</div>
                        <div className="results-stat-label">Correct</div>
                    </div>
                    <div className="results-stat">
                        <div className="results-stat-value" style={{ color: 'var(--error)' }}>{stats.total - stats.correct}</div>
                        <div className="results-stat-label">Incorrect</div>
                    </div>
                    <div className="results-stat">
                        <div className="results-stat-value" style={{ color: 'var(--xp-gold)' }}>+{xpEarned}</div>
                        <div className="results-stat-label">XP Earned</div>
                    </div>
                    <div className="results-stat">
                        <div className="results-stat-value" style={{ color: 'var(--info)' }}>{stats.avgTime}s</div>
                        <div className="results-stat-label">Avg Time</div>
                    </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--space-4)', justifyContent: 'center', marginTop: 'var(--space-6)' }}>
                    <button className="btn btn-secondary btn-lg" onClick={onBackToTopics}>
                        ← All Topics
                    </button>
                    <button className="btn btn-primary btn-lg" onClick={onRestart}>
                        Practice Again
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

// Fallback questions when no bank/generator exists
function createFallbackQuestions(topic) {
    return [{
        id: 'fallback-1',
        topic: topic?.id || 'general',
        category: topic?.category || 'quantitative',
        difficulty: 'basic',
        type: 'mcq',
        questionText: `This is a sample question for ${topic?.name || 'General'}. What is the correct answer?`,
        options: ['Option A (Correct)', 'Option B', 'Option C', 'Option D'],
        correctAnswer: 'Option A (Correct)',
        explanation: 'This is a sample question. More questions will be added to this topic.',
        trickHint: 'Read the question carefully and look for key words.',
        xpValue: 10,
        timerValue: 60,
    }];
}

export default PracticePage;
