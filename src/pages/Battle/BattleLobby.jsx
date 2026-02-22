import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { createRoom, joinRoom, onRoomUpdate, leaveRoom, startBattle } from '../../services/battleService';
import { ALL_TOPICS } from '../../data/topicConfig';

const BattleLobby = () => {
    const { user, profile } = useAuth();
    const navigate = useNavigate();

    const [step, setStep] = useState('home');       // home → mode → create → waiting | join → waiting
    const [mode, setMode] = useState('1v1');
    const [roomCode, setRoomCode] = useState('');
    const [joinCode, setJoinCode] = useState('');
    const [room, setRoom] = useState(null);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedTopic, setSelectedTopic] = useState('percentage');
    const [copied, setCopied] = useState(false);

    // Listen for room updates
    useEffect(() => {
        if (!roomCode) return;
        const unsub = onRoomUpdate(roomCode, (data) => {
            if (!data) {
                setRoom(null);
                setRoomCode('');
                setError('Room was closed.');
                setStep('home');
                return;
            }
            setRoom(data);
            if (data.status === 'playing') {
                navigate(`/battle/${roomCode}`);
            }
        });
        return unsub;
    }, [roomCode, navigate]);

    const handleCreate = async () => {
        if (!user) return;
        setError('');
        setLoading(true);
        try {
            const code = await createRoom(user, profile, mode, selectedTopic, 'moderate');
            setRoomCode(code);
            setStep('waiting');
        } catch (err) {
            setError(err.message || 'Failed to create room. Check your internet connection.');
        }
        setLoading(false);
    };

    const handleJoin = async () => {
        if (!user || joinCode.length !== 6) return;
        setError('');
        setLoading(true);
        try {
            await joinRoom(joinCode, user, profile);
            setRoomCode(joinCode);
            setStep('waiting');
        } catch (err) {
            setError(err.message || 'Failed to join. Check the code.');
        }
        setLoading(false);
    };

    const handleStart = async () => {
        try { await startBattle(roomCode); }
        catch (err) { setError('Failed to start.'); }
    };

    const handleLeave = async () => {
        if (roomCode && user) await leaveRoom(roomCode, user.uid);
        setRoom(null);
        setRoomCode('');
        setStep('home');
    };

    const copyCode = () => {
        navigator.clipboard?.writeText(roomCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const players = room?.players ? Object.entries(room.players) : [];
    const isHost = room?.hostId === user?.uid;
    const canStart = players.length >= 2;

    const topicChoices = ALL_TOPICS.slice(0, 12);
    const selectedTopicObj = ALL_TOPICS.find(t => t.id === selectedTopic);

    const ErrorBanner = () => error ? (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            style={{
                background: 'linear-gradient(135deg, #FFF0F0, #FFE8E8)', border: '1px solid #FFCDD2',
                borderRadius: 12, padding: '12px 16px', marginBottom: 20,
                fontSize: '0.8125rem', color: '#C62828', display: 'flex', alignItems: 'center', gap: 8,
            }}>
            <span>⚠️</span> {error}
            <button onClick={() => setError('')} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#C62828', cursor: 'pointer', fontSize: '1rem' }}>×</button>
        </motion.div>
    ) : null;

    // ========== HOME: Mode Selection ==========
    if (step === 'home') {
        return (
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    {/* Hero */}
                    <div style={{ textAlign: 'center', marginBottom: 32 }}>
                        <div style={{ fontSize: '3.5rem', marginBottom: 12 }}>⚔️</div>
                        <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 6 }}>Battle Arena</h1>
                        <p style={{ color: 'var(--text-secondary)', fontSize: '0.9375rem' }}>
                            Challenge friends in real-time aptitude battles
                        </p>
                    </div>

                    <ErrorBanner />

                    {/* Mode Cards */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        {[
                            { key: '1v1', icon: '⚔️', title: '1 vs 1 Duel', desc: 'Head-to-head. Who answers faster wins.', gradient: 'linear-gradient(135deg, #1B4F72, #2E86C1)', shadow: '0 4px 20px rgba(27,79,114,0.25)' },
                            { key: '1v4', icon: '🏟️', title: 'Squad Battle', desc: 'Up to 4 players. Top scorer wins!', gradient: 'linear-gradient(135deg, #1E6F50, #27AE60)', shadow: '0 4px 20px rgba(30,111,80,0.25)' },
                        ].map(m => (
                            <motion.div
                                key={m.key}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={() => { setMode(m.key); setStep('action'); }}
                                style={{
                                    background: m.gradient, borderRadius: 16, padding: '24px 20px',
                                    cursor: 'pointer', color: 'white', boxShadow: m.shadow,
                                    display: 'flex', alignItems: 'center', gap: 16,
                                }}
                            >
                                <div style={{ fontSize: '2.5rem', flexShrink: 0 }}>{m.icon}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '1.125rem', marginBottom: 4 }}>{m.title}</div>
                                    <div style={{ fontSize: '0.8125rem', opacity: 0.85 }}>{m.desc}</div>
                                </div>
                                <div style={{ fontSize: '1.25rem', opacity: 0.7 }}>→</div>
                            </motion.div>
                        ))}
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 24 }}>
                        <button className="btn btn-ghost" onClick={() => navigate('/dashboard')} style={{ fontSize: '0.875rem' }}>
                            ← Back to Dashboard
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ========== ACTION: Create or Join ==========
    if (step === 'action') {
        return (
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>{mode === '1v1' ? '⚔️' : '🏟️'}</div>
                        <h2 style={{ fontSize: '1.375rem', fontWeight: 700 }}>
                            {mode === '1v1' ? '1 vs 1 Duel' : 'Squad Battle'}
                        </h2>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        {/* Create Room */}
                        <motion.div
                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                            onClick={() => setStep('create')}
                            style={{
                                background: 'var(--bg-card)', border: '2px solid var(--border-light)',
                                borderRadius: 14, padding: '20px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 14,
                                transition: 'border-color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--quant-primary)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                        >
                            <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: 'var(--quant-bg)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0,
                            }}>🏠</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>Create Room</div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Pick a topic & share the code</div>
                            </div>
                            <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</div>
                        </motion.div>

                        {/* Join Room */}
                        <motion.div
                            whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}
                            onClick={() => setStep('join')}
                            style={{
                                background: 'var(--bg-card)', border: '2px solid var(--border-light)',
                                borderRadius: 14, padding: '20px', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', gap: 14,
                                transition: 'border-color 0.2s',
                            }}
                            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--logical-primary)'}
                            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-light)'}
                        >
                            <div style={{
                                width: 48, height: 48, borderRadius: 12,
                                background: 'var(--logical-bg)', display: 'flex',
                                alignItems: 'center', justifyContent: 'center', fontSize: '1.5rem', flexShrink: 0,
                            }}>🔗</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 2 }}>Join Room</div>
                                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Enter 6-digit code to join</div>
                            </div>
                            <div style={{ marginLeft: 'auto', color: 'var(--text-muted)' }}>→</div>
                        </motion.div>
                    </div>

                    <div style={{ textAlign: 'center', marginTop: 20 }}>
                        <button className="btn btn-ghost" onClick={() => setStep('home')} style={{ fontSize: '0.875rem' }}>
                            ← Change Mode
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ========== CREATE: Topic Selection ==========
    if (step === 'create') {
        return (
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ textAlign: 'center', marginBottom: 24 }}>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Choose Battle Topic</h2>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Both players will answer questions from this topic</p>
                    </div>

                    <ErrorBanner />

                    {/* Topic Grid */}
                    <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
                        gap: 8, marginBottom: 24,
                    }}>
                        {topicChoices.map(t => (
                            <motion.div
                                key={t.id}
                                whileTap={{ scale: 0.95 }}
                                onClick={() => setSelectedTopic(t.id)}
                                style={{
                                    padding: '14px 8px',
                                    borderRadius: 12,
                                    border: selectedTopic === t.id ? '2px solid var(--quant-primary)' : '1px solid var(--border-light)',
                                    background: selectedTopic === t.id ? 'var(--quant-bg)' : 'var(--bg-card)',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <div style={{ fontSize: '1.25rem', marginBottom: 4 }}>{t.icon}</div>
                                <div style={{
                                    fontSize: '0.6875rem', fontWeight: selectedTopic === t.id ? 700 : 500,
                                    color: selectedTopic === t.id ? 'var(--quant-primary)' : 'var(--text-secondary)',
                                    lineHeight: 1.2,
                                }}>{t.name}</div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Selected Topic */}
                    {selectedTopicObj && (
                        <div style={{
                            background: 'var(--neutral-50)', borderRadius: 12,
                            padding: '12px 16px', marginBottom: 20,
                            display: 'flex', alignItems: 'center', gap: 10,
                        }}>
                            <span style={{ fontSize: '1.25rem' }}>{selectedTopicObj.icon}</span>
                            <div>
                                <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{selectedTopicObj.name}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>10 questions · 30s each</div>
                            </div>
                        </div>
                    )}

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleCreate}
                        disabled={loading}
                        style={{
                            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, var(--quant-primary), var(--quant-secondary))',
                            color: 'white', fontWeight: 700, fontSize: '1rem', cursor: loading ? 'wait' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                        }}
                    >
                        {loading ? '⏳ Creating Room...' : '🚀 Create Battle Room'}
                    </motion.button>

                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <button className="btn btn-ghost" onClick={() => setStep('action')} style={{ fontSize: '0.875rem' }}>
                            ← Back
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ========== JOIN: Enter Code ==========
    if (step === 'join') {
        return (
            <div style={{ maxWidth: 420, margin: '0 auto', padding: '0 16px' }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <div style={{ textAlign: 'center', marginBottom: 28 }}>
                        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>🔗</div>
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: 4 }}>Join Battle</h2>
                        <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>Ask your friend for the 6-digit room code</p>
                    </div>

                    <ErrorBanner />

                    {/* Code Input */}
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 16,
                        border: '1px solid var(--border-light)', padding: '24px 20px',
                        marginBottom: 20,
                    }}>
                        <input
                            type="text"
                            inputMode="numeric"
                            maxLength={6}
                            placeholder="000000"
                            value={joinCode}
                            onChange={(e) => setJoinCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            autoFocus
                            style={{
                                width: '100%', textAlign: 'center',
                                fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800,
                                letterSpacing: '0.35em', padding: '16px 8px',
                                border: '2px solid var(--border-medium)', borderRadius: 12,
                                color: 'var(--quant-primary)', background: 'var(--neutral-50)',
                                outline: 'none', transition: 'border-color 0.2s',
                            }}
                            onFocus={e => e.target.style.borderColor = 'var(--quant-primary)'}
                            onBlur={e => e.target.style.borderColor = 'var(--border-medium)'}
                        />
                        <div style={{ textAlign: 'center', marginTop: 8, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            {joinCode.length}/6 digits
                        </div>
                    </div>

                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleJoin}
                        disabled={loading || joinCode.length !== 6}
                        style={{
                            width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                            background: joinCode.length === 6
                                ? 'linear-gradient(135deg, var(--logical-primary), var(--logical-secondary))'
                                : 'var(--neutral-200)',
                            color: joinCode.length === 6 ? 'white' : 'var(--text-muted)',
                            fontWeight: 700, fontSize: '1rem',
                            cursor: joinCode.length === 6 ? 'pointer' : 'not-allowed',
                            opacity: loading ? 0.7 : 1, transition: 'all 0.2s',
                        }}
                    >
                        {loading ? '⏳ Joining...' : '🎯 Join Battle'}
                    </motion.button>

                    <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <button className="btn btn-ghost" onClick={() => setStep('action')} style={{ fontSize: '0.875rem' }}>
                            ← Back
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    // ========== WAITING ROOM ==========
    if (step === 'waiting' && room?.status === 'waiting') {
        const topicObj = ALL_TOPICS.find(t => t.id === room.topic);

        return (
            <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px' }}>
                <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}>
                    <ErrorBanner />

                    {/* Room Code Card */}
                    <div style={{
                        background: 'linear-gradient(135deg, #EBF5FB, #EAFAF1)',
                        borderRadius: 20, padding: '28px 20px', textAlign: 'center',
                        border: '2px solid var(--quant-light)', marginBottom: 20,
                    }}>
                        <div style={{
                            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.12em', color: 'var(--text-muted)', marginBottom: 8,
                        }}>Share this code with friends</div>
                        <div style={{
                            fontFamily: 'var(--font-mono)', fontSize: '2.75rem', fontWeight: 900,
                            letterSpacing: '0.25em', color: 'var(--quant-primary)', marginBottom: 12,
                        }}>{roomCode}</div>
                        <motion.button
                            whileTap={{ scale: 0.95 }}
                            onClick={copyCode}
                            style={{
                                padding: '8px 20px', borderRadius: 20, border: 'none',
                                background: copied ? 'var(--success)' : 'var(--quant-primary)',
                                color: 'white', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer',
                            }}
                        >
                            {copied ? '✓ Copied!' : '📋 Copy Code'}
                        </motion.button>
                    </div>

                    {/* Topic Pill */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                        marginBottom: 20, fontSize: '0.8125rem', color: 'var(--text-secondary)',
                    }}>
                        <span>{topicObj?.icon}</span>
                        <span style={{ fontWeight: 600 }}>{topicObj?.name}</span>
                        <span>·</span>
                        <span>{room.totalQuestions} Qs</span>
                        <span>·</span>
                        <span>{mode === '1v1' ? '1v1' : '1v4'}</span>
                    </div>

                    {/* Players */}
                    <div style={{
                        background: 'var(--bg-card)', borderRadius: 16,
                        border: '1px solid var(--border-light)', padding: '20px',
                        marginBottom: 20,
                    }}>
                        <div style={{
                            fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                            letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14,
                        }}>
                            Players ({players.length}/{room.maxPlayers})
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                            {players.map(([id, player], i) => {
                                const colors = [
                                    'linear-gradient(135deg, #1B4F72, #2E86C1)',
                                    'linear-gradient(135deg, #1E6F50, #27AE60)',
                                    'linear-gradient(135deg, #6C3483, #A569BD)',
                                    'linear-gradient(135deg, #BA4A00, #E67E22)',
                                ];
                                return (
                                    <motion.div
                                        key={id}
                                        initial={{ opacity: 0, x: -12 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        style={{
                                            display: 'flex', alignItems: 'center', gap: 12,
                                            padding: '12px 14px', borderRadius: 12,
                                            background: id === user?.uid ? 'var(--quant-bg)' : 'var(--neutral-50)',
                                            border: id === user?.uid ? '1px solid var(--quant-light)' : '1px solid transparent',
                                        }}
                                    >
                                        <div style={{
                                            width: 38, height: 38, borderRadius: '50%',
                                            background: colors[i] || colors[0],
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            color: 'white', fontWeight: 700, fontSize: '0.875rem', flexShrink: 0,
                                        }}>
                                            {player.name?.[0]?.toUpperCase() || 'P'}
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontWeight: 600, fontSize: '0.9375rem' }}>
                                                {player.name}{id === user?.uid ? ' (You)' : ''}
                                            </div>
                                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                                {player.isHost ? '👑 Host' : '✅ Ready'}
                                            </div>
                                        </div>
                                        <div style={{
                                            width: 8, height: 8, borderRadius: '50%',
                                            background: player.connected ? 'var(--success)' : 'var(--neutral-300)',
                                        }} />
                                    </motion.div>
                                );
                            })}

                            {/* Empty Slots */}
                            {Array.from({ length: room.maxPlayers - players.length }).map((_, i) => (
                                <div key={`e-${i}`} style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '12px 14px', borderRadius: 12,
                                    background: 'var(--neutral-50)', opacity: 0.5,
                                    border: '1px dashed var(--border-medium)',
                                }}>
                                    <div style={{
                                        width: 38, height: 38, borderRadius: '50%',
                                        background: 'var(--neutral-200)',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: 'var(--text-muted)', fontSize: '1rem',
                                    }}>?</div>
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.8125rem' }}>
                                        Waiting for player...
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={handleLeave} style={{
                            flex: 1, padding: '12px', borderRadius: 12, border: '1px solid var(--border-medium)',
                            background: 'var(--bg-card)', color: 'var(--text-secondary)',
                            fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                        }}>
                            Leave
                        </button>
                        {isHost ? (
                            <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleStart}
                                disabled={!canStart}
                                style={{
                                    flex: 2, padding: '12px', borderRadius: 12, border: 'none',
                                    background: canStart
                                        ? 'linear-gradient(135deg, var(--quant-primary), var(--quant-secondary))'
                                        : 'var(--neutral-200)',
                                    color: canStart ? 'white' : 'var(--text-muted)',
                                    fontWeight: 700, fontSize: '0.9375rem',
                                    cursor: canStart ? 'pointer' : 'not-allowed',
                                }}
                            >
                                {canStart ? '🚀 Start Battle!' : `Need ${room.maxPlayers - players.length} more`}
                            </motion.button>
                        ) : (
                            <div style={{
                                flex: 2, padding: '12px', textAlign: 'center', borderRadius: 12,
                                background: 'var(--neutral-50)', color: 'var(--text-muted)',
                                fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                            }}>
                                <motion.span animate={{ opacity: [1, 0.3, 1] }} transition={{ duration: 1.5, repeat: Infinity }}>⏳</motion.span>
                                Waiting for host...
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        );
    }

    return null;
};

export default BattleLobby;
