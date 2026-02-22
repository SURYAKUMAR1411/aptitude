import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { onRoomUpdate, submitAnswer, nextQuestion, leaveRoom } from '../../services/battleService';
import BattleResults from './BattleResults';

const BattleArena = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const { user, addXP } = useAuth();

    const [room, setRoom] = useState(null);
    const [timer, setTimer] = useState(30);
    const [selectedAnswer, setSelectedAnswer] = useState(null);
    const [answerResult, setAnswerResult] = useState(null);
    const [hasAnswered, setHasAnswered] = useState(false);
    const [allAnswered, setAllAnswered] = useState(false);
    const timerRef = useRef(null);
    const startTimeRef = useRef(null);
    const lastQuestionRef = useRef(-1);

    // Listen to room
    useEffect(() => {
        if (!roomId) return;
        const unsub = onRoomUpdate(roomId, (data) => {
            if (!data) { navigate('/battle'); return; }
            setRoom(data);
        });
        return unsub;
    }, [roomId, navigate]);

    // Reset on new question
    useEffect(() => {
        if (!room || room.status !== 'playing') return;
        if (room.currentQuestion !== lastQuestionRef.current) {
            lastQuestionRef.current = room.currentQuestion;
            setSelectedAnswer(null);
            setAnswerResult(null);
            setHasAnswered(false);
            setAllAnswered(false);
            startTimeRef.current = Date.now();
            setTimer(30);

            clearInterval(timerRef.current);
            timerRef.current = setInterval(() => {
                setTimer(prev => {
                    if (prev <= 1) {
                        clearInterval(timerRef.current);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }
    }, [room?.currentQuestion, room?.status]);

    // Auto-submit on timeout
    useEffect(() => {
        if (timer === 0 && !hasAnswered && room?.status === 'playing') {
            handleTimeout();
        }
    }, [timer, hasAnswered]);

    // Check if all answered
    useEffect(() => {
        if (!room || room.status !== 'playing') return;
        const qi = room.currentQuestion;
        const responses = room.responses?.[qi] || {};
        const playerCount = Object.keys(room.players || {}).length;
        if (Object.keys(responses).length >= playerCount && playerCount > 0) {
            setAllAnswered(true);
        }
    }, [room]);

    useEffect(() => () => clearInterval(timerRef.current), []);

    const handleTimeout = useCallback(async () => {
        if (hasAnswered || !user || !roomId || !room) return;
        setHasAnswered(true);
        const result = await submitAnswer(roomId, user.uid, room.currentQuestion, '__timeout__', 30);
        setAnswerResult(result);
    }, [hasAnswered, user, roomId, room?.currentQuestion]);

    const handleSubmit = async () => {
        if (!selectedAnswer || hasAnswered || !user || !roomId || !room) return;
        clearInterval(timerRef.current);
        setHasAnswered(true);
        const timeTaken = startTimeRef.current ? (Date.now() - startTimeRef.current) / 1000 : 30;
        const result = await submitAnswer(roomId, user.uid, room.currentQuestion, selectedAnswer, timeTaken);
        setAnswerResult(result);
        if (result.isCorrect) addXP(Math.round(result.points / 10));
    };

    const handleNext = async () => {
        if (!room || room.hostId !== user?.uid) return;
        await nextQuestion(roomId, room.currentQuestion, room.totalQuestions);
    };

    const handleLeave = async () => {
        clearInterval(timerRef.current);
        if (roomId && user) await leaveRoom(roomId, user.uid);
        navigate('/battle');
    };

    // Loading
    if (!room) {
        return (
            <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                    style={{ fontSize: '2.5rem', display: 'inline-block', marginBottom: 12 }}>⚔️</motion.div>
                <p style={{ color: 'var(--text-secondary)' }}>Connecting to battle...</p>
            </div>
        );
    }

    // Results
    if (room.status === 'finished') {
        return <BattleResults room={room} userId={user?.uid} roomId={roomId} />;
    }

    const question = room.questions?.[room.currentQuestion];
    if (!question) return null;

    const isHost = room.hostId === user?.uid;
    const players = Object.entries(room.players || {}).sort((a, b) => b[1].score - a[1].score);
    const timerPct = (timer / 30) * 100;

    return (
        <div style={{ maxWidth: 640, margin: '0 auto', padding: '0 12px' }}>
            {/* Header */}
            <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                marginBottom: 16, paddingBottom: 12, borderBottom: '1px solid var(--border-light)',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>⚔️</span>
                    <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                        Q{room.currentQuestion + 1}/{room.totalQuestions}
                    </span>
                </div>

                {/* Timer Bar */}
                <div style={{
                    width: 120, height: 32, borderRadius: 16, overflow: 'hidden',
                    background: 'var(--neutral-200)', position: 'relative',
                }}>
                    <div style={{
                        position: 'absolute', top: 0, left: 0, height: '100%',
                        width: `${timerPct}%`, borderRadius: 16,
                        background: timer <= 5 ? 'var(--error)' : timer <= 10 ? 'var(--warning)' : 'var(--quant-primary)',
                        transition: 'width 1s linear',
                    }} />
                    <span style={{
                        position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 700,
                        color: 'white', textShadow: '0 1px 2px rgba(0,0,0,0.3)', zIndex: 1,
                    }}>⏱ {timer}s</span>
                </div>
            </div>

            {/* Live Scores */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 20, overflowX: 'auto' }}>
                {players.map(([id, player], i) => (
                    <div key={id} style={{
                        flex: 1, minWidth: 100, padding: '10px 12px', borderRadius: 10,
                        background: id === user?.uid ? 'var(--quant-bg)' : 'var(--neutral-50)',
                        border: id === user?.uid ? '2px solid var(--quant-primary)' : '1px solid var(--border-light)',
                        textAlign: 'center', position: 'relative',
                    }}>
                        <div style={{ fontSize: '0.6875rem', fontWeight: 600, color: 'var(--text-muted)', marginBottom: 2 }}>
                            {id === user?.uid ? '🫵 You' : player.name?.split(' ')[0]}
                        </div>
                        <div style={{
                            fontFamily: 'var(--font-mono)', fontSize: '1.125rem',
                            fontWeight: 800, color: 'var(--quant-primary)',
                        }}>{player.score}</div>
                        {room.responses?.[room.currentQuestion]?.[id] && (
                            <div style={{
                                position: 'absolute', top: -4, right: -4, width: 16, height: 16,
                                borderRadius: '50%', background: 'var(--success)', color: 'white',
                                fontSize: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>✓</div>
                        )}
                    </div>
                ))}
            </div>

            {/* Question */}
            <AnimatePresence mode="wait">
                <motion.div key={room.currentQuestion}
                    initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    <div style={{
                        background: 'var(--bg-card)', border: '1px solid var(--border-light)',
                        borderRadius: 16, padding: '24px 20px', marginBottom: 16,
                    }}>
                        <div style={{
                            fontFamily: 'var(--font-heading)', fontSize: '1.0625rem',
                            fontWeight: 600, lineHeight: 1.6, color: 'var(--text-primary)', marginBottom: 20,
                        }}>
                            {question.questionText}
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {(question.options || []).map((option, idx) => {
                                const letter = String.fromCharCode(65 + idx);
                                let bg = 'var(--bg-card)';
                                let borderColor = 'var(--border-light)';
                                let markerBg = 'transparent';
                                let markerColor = 'var(--text-secondary)';

                                if (answerResult) {
                                    if (option === answerResult.correctAnswer) {
                                        bg = '#EAFAF1'; borderColor = 'var(--success)';
                                        markerBg = 'var(--success)'; markerColor = 'white';
                                    } else if (option === selectedAnswer) {
                                        bg = '#FDECEC'; borderColor = 'var(--error)';
                                        markerBg = 'var(--error)'; markerColor = 'white';
                                    }
                                } else if (option === selectedAnswer) {
                                    bg = 'var(--quant-bg)'; borderColor = 'var(--quant-primary)';
                                    markerBg = 'var(--quant-primary)'; markerColor = 'white';
                                }

                                return (
                                    <motion.div
                                        key={idx}
                                        whileTap={!hasAnswered ? { scale: 0.98 } : {}}
                                        onClick={() => !hasAnswered && setSelectedAnswer(option)}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '14px 16px', borderRadius: 12,
                                            border: `2px solid ${borderColor}`, background: bg,
                                            cursor: hasAnswered ? 'default' : 'pointer',
                                            transition: 'all 0.15s ease', fontSize: '0.9375rem',
                                        }}
                                    >
                                        <div style={{
                                            width: 28, height: 28, borderRadius: '50%',
                                            border: `2px solid ${borderColor}`, background: markerBg,
                                            color: markerColor, display: 'flex', alignItems: 'center',
                                            justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700,
                                            flexShrink: 0, transition: 'all 0.15s',
                                        }}>{letter}</div>
                                        <span>{option}</span>
                                    </motion.div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Answer Result */}
                    {answerResult && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            style={{
                                background: answerResult.isCorrect ? '#F0FFF4' : '#FFF5F5',
                                border: `1px solid ${answerResult.isCorrect ? '#C6F6D5' : '#FED7D7'}`,
                                borderRadius: 12, padding: '16px', marginBottom: 16,
                            }}
                        >
                            <div style={{ fontWeight: 700, fontSize: '0.9375rem', marginBottom: 6 }}>
                                {answerResult.isCorrect
                                    ? `✅ Correct! +${answerResult.points} pts`
                                    : '❌ Incorrect'}
                            </div>
                            <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                                {answerResult.explanation}
                            </div>
                        </motion.div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={handleLeave} style={{
                            flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border-medium)',
                            background: 'var(--bg-card)', color: 'var(--text-muted)', fontWeight: 600,
                            fontSize: '0.8125rem', cursor: 'pointer',
                        }}>🚪 Leave</button>

                        {!hasAnswered ? (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleSubmit}
                                disabled={!selectedAnswer}
                                style={{
                                    flex: 2, padding: '12px', borderRadius: 12, border: 'none',
                                    background: selectedAnswer
                                        ? 'linear-gradient(135deg, var(--quant-primary), var(--quant-secondary))'
                                        : 'var(--neutral-200)',
                                    color: selectedAnswer ? 'white' : 'var(--text-muted)',
                                    fontWeight: 700, fontSize: '0.9375rem',
                                    cursor: selectedAnswer ? 'pointer' : 'not-allowed',
                                }}
                            >Submit Answer</motion.button>
                        ) : isHost && allAnswered ? (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleNext}
                                style={{
                                    flex: 2, padding: '12px', borderRadius: 12, border: 'none',
                                    background: 'linear-gradient(135deg, var(--quant-primary), var(--quant-secondary))',
                                    color: 'white', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer',
                                }}
                            >
                                {room.currentQuestion + 1 >= room.totalQuestions ? '🏆 View Results' : 'Next Question →'}
                            </motion.button>
                        ) : (
                            <div style={{
                                flex: 2, padding: '12px', borderRadius: 12, background: 'var(--neutral-50)',
                                color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center',
                                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}>
                                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>⏳</motion.span>
                                {allAnswered ? 'Waiting for host...' : 'Waiting for others...'}
                            </div>
                        )}
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    );
};

export default BattleArena;
