import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail,
    updateProfile,
    onAuthStateChanged,
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from './firebase';

const DEFAULT_USER_PROFILE = {
    xp: 0,
    level: 1,
    streak: 0,
    readinessScore: 0,
    topicMastery: {},
    unlockedTopics: ['percentage', 'blood-relations', 'error-spotting'],
    lastActive: null,
    createdAt: null,
};

export const registerUser = async (email, password, name) => {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;

    await updateProfile(user, { displayName: name });

    await setDoc(doc(db, 'users', user.uid), {
        ...DEFAULT_USER_PROFILE,
        userId: user.uid,
        name,
        email,
        createdAt: serverTimestamp(),
        lastActive: serverTimestamp(),
    });

    return user;
};

export const loginUser = async (email, password) => {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    await updateDoc(doc(db, 'users', userCredential.user.uid), {
        lastActive: serverTimestamp(),
    });
    return userCredential.user;
};

export const logoutUser = async () => {
    await signOut(auth);
};

export const resetPassword = async (email) => {
    if (!email || !email.includes('@')) {
        throw new Error('Please enter a valid email address.');
    }

    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        const code = error.code || '';
        if (code === 'auth/user-not-found') {
            throw new Error('No account found with this email address.');
        } else if (code === 'auth/invalid-email') {
            throw new Error('Please enter a valid email address.');
        } else if (code === 'auth/too-many-requests') {
            throw new Error('Too many attempts. Please try again later.');
        } else if (code === 'auth/network-request-failed') {
            throw new Error('Network error. Please check your internet connection.');
        } else if (code.includes('api-key') || code.includes('invalid-api')) {
            throw new Error('Firebase is not configured yet. Please add your real Firebase credentials to a .env file. See .env.example for the required keys.');
        } else {
            throw new Error(error.message || 'Failed to send reset email. Please try again.');
        }
    }
};

export const getUserProfile = async (userId) => {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() };
    }
    return null;
};

export const updateUserProfile = async (userId, data) => {
    const docRef = doc(db, 'users', userId);
    await updateDoc(docRef, { ...data, lastActive: serverTimestamp() });
};

export const onAuthChange = (callback) => {
    return onAuthStateChanged(auth, callback);
};
