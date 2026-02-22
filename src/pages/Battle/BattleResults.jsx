import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { leaveRoom } from '../../services/battleService';
import { useAuth } from '../../context/AuthContext';

const BattleResults = ({ room, userId, roomId }) => {
    const navigate = useNavigate();
    const { user, addXP } = useAuth();
    const hasAddedXP = useRef(false);

    const players = Object.entries(room?.players || {})
        .sort((a, b) => b[1].score - a[1].score);

    const myRank = players.findIndex(([id]) => id === userId) + 1;
    const isWinner = myRank === 1;
    const myPlayer = room?.players?.[userId];
    const totalQ = room?.totalQuestions || 10;
    const accuracy = Math.round((myPlayer?.correctCount || 0) / totalQ * 100);

    // Add battle points to XP after results are shown
    useEffect(() => {
        if (myPlayer?.score && !hasAddedXP.current) {
            addXP(myPlayer.score);
            hasAddedXP.current = true;
        }
    }, [myPlayer?.score, addXP]);

    const rankEmojis = ['🥇', '🥈', '🥉', '4️⃣'];

    const handleLeave = async () => {
        if (roomId && user) await leaveRoom(roomId, user.uid);
        navigate('/battle');
    };

    return (
        <div style={{ maxWidth: 480, margin: '0 auto', padding: '0 16px', textAlign: 'center' }}>
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
                {/* Winner Badge */}
                <motion.div
                    initial={{ scale: 0 }} animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    style={{ fontSize: '4rem', marginBottom: 8, marginTop: 16 }}
                >
                    {isWinner ? '🏆' : myRank === 2 ? '🥈' : '💪'}
                </motion.div>
                <h1 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4 }}>
                    {isWinner ? 'Victory!' : myRank === 2 ? 'Almost!' : 'Good Fight!'}
                </h1>
                <p style={{ color: 'var(--text-secondary)', marginBottom: 28, fontSize: '0.9375rem' }}>
                    You placed <strong>#{myRank}</strong> with <strong>{myPlayer?.score || 0} points</strong>
                </p>

                {/* Rankings Card */}
                <div style={{
                    background: 'var(--bg-card)', borderRadius: 16,
                    border: '1px solid var(--border-light)', padding: '20px',
                    marginBottom: 20, textAlign: 'left',
                }}>
                    <div style={{
                        fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase',
                        letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 14,
                    }}>Final Rankings</div>

                    {players.map(([id, player], i) => {
                        const gradients = [
                            'linear-gradient(135deg, #FFD700, #FFA000)',
                            'linear-gradient(135deg, #B0BEC5, #90A4AE)',
                            'linear-gradient(135deg, #CD7F32, #A0522D)',
                            'linear-gradient(135deg, #9E9E9E, #757575)',
                        ];
                        return (
                            <motion.div
                                key={id}
                                initial={{ opacity: 0, x: -16 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: 0.3 + i * 0.12 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 12,
                                    padding: '14px', borderRadius: 12, marginBottom: 8,
                                    background: id === userId ? 'var(--quant-bg)' : 'var(--neutral-50)',
                                    border: id === userId ? '2px solid var(--quant-primary)' : '1px solid transparent',
                                }}
                            >
                                <div style={{
                                    width: 36, height: 36, borderRadius: '50%',
                                    background: gradients[i] || gradients[3],
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: 'white', fontWeight: 800, fontSize: '0.875rem', flexShrink: 0,
                                }}>{i + 1}</div>
                                <div style={{ flex: 1 }}>
                                    <div style={{ fontWeight: 700, fontSize: '0.9375rem' }}>
                                        {id === userId ? 'You' : player.name}
                                        {id === userId && <span style={{ fontSize: '0.75rem', opacity: 0.7 }}> 🫵</span>}
                                    </div>
                                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                                        {player.correctCount}/{totalQ} correct
                                    </div>
                                </div>
                                <div style={{
                                    fontFamily: 'var(--font-mono)', fontSize: '1.25rem',
                                    fontWeight: 900, color: i === 0 ? '#D4A017' : 'var(--text-primary)',
                                }}>{player.score}</div>
                            </motion.div>
                        );
                    })}
                </div>

                {/* Your Stats */}
                <div style={{
                    display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8,
                    marginBottom: 24,
                }}>
                    {[
                        { label: 'Correct', value: myPlayer?.correctCount || 0, color: 'var(--success)' },
                        { label: 'Wrong', value: totalQ - (myPlayer?.correctCount || 0), color: 'var(--error)' },
                        { label: 'Points', value: myPlayer?.score || 0, color: 'var(--xp-gold)' },
                        { label: 'Accuracy', value: `${accuracy}%`, color: 'var(--info)' },
                    ].map(s => (
                        <div key={s.label} style={{
                            background: 'var(--neutral-50)', borderRadius: 12, padding: '14px 8px',
                            border: '1px solid var(--border-light)',
                        }}>
                            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.25rem', fontWeight: 800, color: s.color }}>
                                {s.value}
                            </div>
                            <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2 }}>{s.label}</div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', gap: 10 }}>
                    <button onClick={handleLeave} style={{
                        flex: 1, padding: '13px', borderRadius: 12, border: '1px solid var(--border-medium)',
                        background: 'var(--bg-card)', fontWeight: 600, fontSize: '0.875rem',
                        color: 'var(--text-secondary)', cursor: 'pointer',
                    }}>← Lobby</button>
                    <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={() => navigate('/battle')}
                        style={{
                            flex: 2, padding: '13px', borderRadius: 12, border: 'none',
                            background: 'linear-gradient(135deg, var(--quant-primary), var(--quant-secondary))',
                            color: 'white', fontWeight: 700, fontSize: '0.9375rem', cursor: 'pointer',
                        }}
                    >🔄 Play Again</motion.button>
                </div>
            </motion.div>
        </div>
    );
};

export default BattleResults;
