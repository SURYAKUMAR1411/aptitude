// Battle Service — Works with Firebase RTDB or Local Mode
// Automatically falls back to local mode if RTDB fails

import { rtdb } from './firebase';
import {
    ref, set, get, update, remove, onValue, off,
    onDisconnect,
} from 'firebase/database';
import { getQuestions } from './questionService';

let isFirebaseAvailable = null;

function generateRoomCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// Fast Firebase check — try writing, timeout at 1.5s
async function checkFirebase() {
    if (isFirebaseAvailable !== null) return isFirebaseAvailable;
    try {
        const testRef = ref(rtdb, `__ping/${Date.now()}`);
        await Promise.race([
            set(testRef, true).then(() => remove(testRef)),
            new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500)),
        ]);
        isFirebaseAvailable = true;
    } catch {
        isFirebaseAvailable = false;
        console.warn('Firebase RTDB not available — using local mode.');
    }
    return isFirebaseAvailable;
}

// ===== LOCAL STORAGE =====
const localRooms = {};
const roomListeners = {};

function notifyLocal(code) {
    const room = localRooms[code];
    (roomListeners[code] || []).forEach(cb => cb(room ? { ...room } : null));
}

// ===== CREATE ROOM =====
export async function createRoom(user, profile, mode = '1v1', topic = 'mixed', difficulty = 'moderate') {
    const maxPlayers = mode === '1v1' ? 2 : 4;
    const roomCode = generateRoomCode();
    const questions = await getQuestions(topic, difficulty, 10);

    const battleQuestions = questions.map((q, i) => ({
        id: q.id || `bq-${i}`,
        questionText: q.questionText,
        options: q.options,
        type: q.type || 'mcq',
        timerValue: 30,
    }));

    const answers = {};
    questions.forEach((q, i) => {
        answers[`bq-${i}`] = {
            correctAnswer: q.correctAnswer,
            explanation: q.explanation || '',
            trickHint: q.trickHint || '',
            xpValue: q.xpValue || 15,
        };
    });

    const roomData = {
        code: roomCode, mode, topic, difficulty, maxPlayers,
        status: 'waiting', hostId: user.uid,
        currentQuestion: -1, totalQuestions: battleQuestions.length,
        questions: battleQuestions, answers, responses: {},
        players: {
            [user.uid]: {
                name: profile?.name || user.displayName || 'Player',
                score: 0, correctCount: 0, answeredCount: 0,
                connected: true, isHost: true, joinedAt: Date.now(),
            },
        },
        createdAt: Date.now(),
    };

    const fb = await checkFirebase();
    if (fb) {
        try {
            await set(ref(rtdb, `rooms/${roomCode}`), roomData);
            onDisconnect(ref(rtdb, `rooms/${roomCode}/players/${user.uid}/connected`)).set(false);
            return roomCode;
        } catch (err) { console.warn('Firebase write fail:', err.message); }
    }

    localRooms[roomCode] = roomData;
    return roomCode;
}

// ===== JOIN ROOM =====
export async function joinRoom(roomCode, user, profile) {
    const playerData = {
        name: profile?.name || user.displayName || 'Player',
        score: 0, correctCount: 0, answeredCount: 0,
        connected: true, isHost: false, joinedAt: Date.now(),
    };

    const fb = await checkFirebase();
    if (fb) {
        try {
            const snap = await get(ref(rtdb, `rooms/${roomCode}`));
            if (snap.exists()) {
                const room = snap.val();
                if (room.status !== 'waiting') throw new Error('Battle already started.');
                if (Object.keys(room.players || {}).length >= room.maxPlayers) throw new Error('Room is full.');
                if (room.players?.[user.uid]) return room;
                await update(ref(rtdb, `rooms/${roomCode}/players/${user.uid}`), playerData);
                onDisconnect(ref(rtdb, `rooms/${roomCode}/players/${user.uid}/connected`)).set(false);
                return room;
            }
        } catch (err) {
            if (err.message.includes('already') || err.message.includes('full')) throw err;
        }
    }

    // Local fallback
    const room = localRooms[roomCode];
    if (!room) throw new Error('Room not found. Check the code and try again.');
    if (room.status !== 'waiting') throw new Error('Battle already started.');
    if (Object.keys(room.players).length >= room.maxPlayers) throw new Error('Room is full.');
    if (!room.players[user.uid]) {
        room.players[user.uid] = playerData;
        notifyLocal(roomCode);
    }
    return room;
}

// ===== START BATTLE =====
export async function startBattle(roomCode) {
    const upd = { status: 'playing', currentQuestion: 0, questionStartTime: Date.now() };
    const fb = await checkFirebase();
    if (fb) { try { await update(ref(rtdb, `rooms/${roomCode}`), upd); return; } catch { } }
    if (localRooms[roomCode]) { Object.assign(localRooms[roomCode], upd); notifyLocal(roomCode); }
}

// ===== SUBMIT ANSWER =====
export async function submitAnswer(roomCode, playerId, questionIndex, answer, timeTaken) {
    let answerData;
    const fb = await checkFirebase();
    if (fb) { try { answerData = (await get(ref(rtdb, `rooms/${roomCode}/answers/bq-${questionIndex}`))).val(); } catch { } }
    if (!answerData) answerData = localRooms[roomCode]?.answers?.[`bq-${questionIndex}`];
    if (!answerData) return { isCorrect: false, points: 0, correctAnswer: '', explanation: '' };

    const isCorrect = answer === answerData.correctAnswer;
    const speedBonus = Math.max(0, Math.round((30 - timeTaken) * 2));
    const points = isCorrect ? (100 + speedBonus) : 0;

    if (fb) {
        try {
            await update(ref(rtdb, `rooms/${roomCode}/responses/${questionIndex}/${playerId}`), {
                answer, isCorrect, timeTaken: Math.round(timeTaken * 10) / 10, points, answeredAt: Date.now(),
            });
            const p = (await get(ref(rtdb, `rooms/${roomCode}/players/${playerId}`))).val();
            await update(ref(rtdb, `rooms/${roomCode}/players/${playerId}`), {
                score: (p?.score || 0) + points,
                correctCount: (p?.correctCount || 0) + (isCorrect ? 1 : 0),
                answeredCount: (p?.answeredCount || 0) + 1,
            });
        } catch { }
    }

    if (localRooms[roomCode]) {
        if (!localRooms[roomCode].responses[questionIndex]) localRooms[roomCode].responses[questionIndex] = {};
        localRooms[roomCode].responses[questionIndex][playerId] = { answer, isCorrect, points };
        const p = localRooms[roomCode].players[playerId];
        if (p) {
            p.score = (p.score || 0) + points;
            p.correctCount = (p.correctCount || 0) + (isCorrect ? 1 : 0);
            p.answeredCount = (p.answeredCount || 0) + 1;
        }
        notifyLocal(roomCode);
    }

    return { isCorrect, points, correctAnswer: answerData.correctAnswer, explanation: answerData.explanation };
}

// ===== NEXT QUESTION =====
export async function nextQuestion(roomCode, currentIndex, totalQuestions) {
    const finished = currentIndex + 1 >= totalQuestions;
    const upd = finished ? { status: 'finished', finishedAt: Date.now() } : { currentQuestion: currentIndex + 1, questionStartTime: Date.now() };
    const fb = await checkFirebase();
    if (fb) { try { await update(ref(rtdb, `rooms/${roomCode}`), upd); } catch { } }
    if (localRooms[roomCode]) { Object.assign(localRooms[roomCode], upd); notifyLocal(roomCode); }
    return !finished;
}

// ===== LISTEN TO ROOM =====
export function onRoomUpdate(roomCode, callback) {
    let fbUnsub = null;

    // Only attach Firebase listener if RTDB is available
    if (isFirebaseAvailable === true) {
        try {
            const roomRef = ref(rtdb, `rooms/${roomCode}`);
            onValue(roomRef, (snap) => { callback(snap.val()); });
            fbUnsub = () => { try { off(roomRef); } catch { } };
        } catch { }
    }

    // Always register local listener as well
    if (!roomListeners[roomCode]) roomListeners[roomCode] = [];
    roomListeners[roomCode].push(callback);

    // If using local mode, emit the current local room data
    if (!fbUnsub && localRooms[roomCode]) {
        setTimeout(() => callback({ ...localRooms[roomCode] }), 50);
    }

    return () => {
        if (fbUnsub) fbUnsub();
        roomListeners[roomCode] = (roomListeners[roomCode] || []).filter(c => c !== callback);
    };
}

// ===== LEAVE ROOM =====
export async function leaveRoom(roomCode, playerId) {
    const fb = await checkFirebase();
    if (fb) {
        try {
            // Use timeout for leave operations too
            await Promise.race([
                (async () => {
                    await remove(ref(rtdb, `rooms/${roomCode}/players/${playerId}`));
                    const snap = await get(ref(rtdb, `rooms/${roomCode}/players`));
                    if (!snap.exists() || Object.keys(snap.val()).length === 0) {
                        await remove(ref(rtdb, `rooms/${roomCode}`));
                    }
                })(),
                new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 1500))
            ]);
        } catch (err) {
            console.warn('Firebase leaveRoom failed or timed out:', err.message);
        }
    }

    if (localRooms[roomCode]) {
        if (localRooms[roomCode].players) {
            delete localRooms[roomCode].players[playerId];
        }
        if (!localRooms[roomCode].players || Object.keys(localRooms[roomCode].players).length === 0) {
            delete localRooms[roomCode];
        } else {
            notifyLocal(roomCode);
        }
    }
}
