import { createContext, useContext, useState, useEffect } from 'react';
import { onAuthChange, getUserProfile, updateUserProfile, logoutUser } from '../services/authService';
import { calculateReadinessScore } from '../services/readinessEngine';
import { calculateLevel } from '../services/adaptiveEngine';

const AuthContext = createContext(null);

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used within AuthProvider');
    return ctx;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Safety timeout — if Firebase takes too long, stop loading
        const timeout = setTimeout(() => {
            setLoading(false);
        }, 5000);

        const unsubscribe = onAuthChange(async (firebaseUser) => {
            clearTimeout(timeout);
            if (firebaseUser) {
                setUser(firebaseUser);

                // 1. Try LocalStorage for instant UI feedback
                const cached = localStorage.getItem(`profile_${firebaseUser.uid}`);
                if (cached) {
                    try {
                        const parsed = JSON.parse(cached);
                        setProfile(parsed);
                    } catch (e) {
                        console.warn('Failed to parse cached profile');
                    }
                }

                try {
                    // 2. Fetch from Firestore (Race against timeout)
                    const userProfile = await Promise.race([
                        getUserProfile(firebaseUser.uid),
                        new Promise((_, reject) => setTimeout(() => reject(new Error('Profile fetch timeout')), 4000)),
                    ]);

                    if (userProfile) {
                        const updatedProfile = checkAndUpdateStreak(userProfile);
                        setProfile(updatedProfile);
                        localStorage.setItem(`profile_${firebaseUser.uid}`, JSON.stringify(updatedProfile));
                    } else {
                        const fresh = createFreshProfile(firebaseUser);
                        setProfile(fresh);
                        localStorage.setItem(`profile_${firebaseUser.uid}`, JSON.stringify(fresh));
                    }
                } catch (err) {
                    console.warn('Failed to fetch from Firestore, using local/fresh:', err.message);
                    if (!cached) {
                        const fresh = createFreshProfile(firebaseUser);
                        setProfile(fresh);
                    }
                }
            } else {
                setUser(null);
                setProfile(null);
            }
            setLoading(false);
        });

        return () => {
            clearTimeout(timeout);
            unsubscribe();
        };
    }, []);

    // Helper: Check and update daily streak
    const checkAndUpdateStreak = (prof) => {
        if (!prof) return prof;

        const now = new Date();
        const lastActive = prof.lastActive ? new Date(prof.lastActive) : null;

        if (!lastActive) {
            return { ...prof, streak: 1, lastActive: now.toISOString() };
        }

        const isSameDay = lastActive.toDateString() === now.toDateString();
        if (isSameDay) return prof;

        const yesterday = new Date();
        yesterday.setDate(now.getDate() - 1);
        const isConsecutiveDay = lastActive.toDateString() === yesterday.toDateString();

        let newStreak = prof.streak || 0;
        if (isConsecutiveDay) {
            newStreak += 1;
        } else {
            newStreak = 1; // Reset if more than a day missed
        }

        return { ...prof, streak: newStreak, lastActive: now.toISOString() };
    };

    const refreshProfile = async () => {
        if (user) {
            try {
                const userProfile = await getUserProfile(user.uid);
                if (userProfile) {
                    setProfile(userProfile);
                    localStorage.setItem(`profile_${user.uid}`, JSON.stringify(userProfile));
                }
            } catch (err) {
                console.warn('Failed to refresh profile:', err.message);
            }
        }
    };

    const updateProfile = async (data) => {
        if (user) {
            const merged = { ...profile, ...data, lastActive: new Date().toISOString() };
            setProfile(merged);
            localStorage.setItem(`profile_${user.uid}`, JSON.stringify(merged));

            try {
                await updateUserProfile(user.uid, data);
            } catch (err) {
                console.warn('Failed to sync to Firestore:', err.message);
            }
        }
    };

    const addXP = async (amount) => {
        if (profile) {
            const newXP = (profile.xp || 0) + amount;
            const levelInfo = calculateLevel(newXP);
            // Also ensure streak is checked when earning XP
            const withStreak = checkAndUpdateStreak({ ...profile, xp: newXP, level: levelInfo.level });
            await updateProfile(withStreak);
        }
    };

    const updateTopicMastery = async (topicId, masteryData) => {
        if (profile) {
            const newMastery = {
                ...profile.topicMastery,
                [topicId]: {
                    ...(profile.topicMastery?.[topicId] || {}),
                    ...masteryData,
                    lastPracticed: new Date().toISOString(),
                },
            };
            const readinessScore = calculateReadinessScore({ ...profile, topicMastery: newMastery });
            await updateProfile({ topicMastery: newMastery, readinessScore });
        }
    };

    const logout = async () => {
        try {
            await logoutUser();
        } catch (err) {
            console.warn('Logout error:', err.message);
        }
        setUser(null);
        setProfile(null);
    };

    // Demo mode: allow usage without Firebase
    const loginAsDemo = () => {
        const demoUser = { uid: 'demo-user', email: 'demo@aptitude.com', displayName: 'Demo User' };
        setUser(demoUser);
        setProfile(createDemoProfile(demoUser));
        setLoading(false);
    };

    const value = {
        user,
        profile,
        loading,
        refreshProfile,
        updateProfile,
        addXP,
        updateTopicMastery,
        logout,
        loginAsDemo,
        isDemo: user?.uid === 'demo-user',
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

// Fresh empty profile for real sign-ups
function createFreshProfile(user) {
    return {
        userId: user.uid,
        name: user.displayName || 'Student',
        email: user.email || '',
        xp: 0,
        level: 1,
        streak: 0,
        readinessScore: 0,
        topicMastery: {},
        unlockedTopics: [
            'percentage', 'profit-and-loss', 'ratio-and-proportion', 'averages',
            'time-and-work', 'time-speed-distance', 'interest', 'mixtures', 'number-system',
            'blood-relations', 'seating-arrangement', 'syllogism', 'coding-decoding',
            'direction-sense', 'data-sufficiency', 'statement-and-conclusion', 'logical-puzzles',
            'error-spotting', 'fill-in-the-blanks', 'para-jumbles', 'reading-comprehension', 'synonyms-antonyms',
        ],
        lastActive: new Date().toISOString(),
    };
}

// Demo profile with sample data (only for "Try Demo Mode")
function createDemoProfile(user) {
    return {
        userId: user.uid,
        name: user.displayName || 'Demo User',
        email: user.email || 'demo@aptitude.com',
        xp: 450,
        level: 3,
        streak: 5,
        readinessScore: 42,
        topicMastery: {
            'percentage': { mastery: 65, accuracy: 78, attempts: 12, speedEfficiency: 0.85, lastPracticed: new Date().toISOString() },
            'profit-and-loss': { mastery: 45, accuracy: 60, attempts: 8, speedEfficiency: 0.7, lastPracticed: new Date().toISOString() },
            'blood-relations': { mastery: 30, accuracy: 55, attempts: 5, speedEfficiency: 0.6, lastPracticed: new Date().toISOString() },
            'error-spotting': { mastery: 50, accuracy: 70, attempts: 6, speedEfficiency: 0.75, lastPracticed: new Date().toISOString() },
        },
        unlockedTopics: [
            'percentage', 'profit-and-loss', 'ratio-and-proportion', 'averages',
            'blood-relations', 'seating-arrangement', 'syllogism', 'coding-decoding',
            'error-spotting', 'fill-in-the-blanks', 'para-jumbles', 'reading-comprehension',
        ],
        lastActive: new Date().toISOString(),
    };
}
