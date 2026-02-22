const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { evaluatePerformance, adjustDifficulty, updateReadinessScore } = require('./adaptiveLogic');

admin.initializeApp();
const db = admin.firestore();

// Evaluate performance after attempt submission
exports.onAttemptCreated = functions.firestore
    .document('attempts/{attemptId}')
    .onCreate(async (snap, context) => {
        const attempt = snap.data();
        const userId = attempt.userId;

        if (!userId) return null;

        try {
            const userRef = db.collection('users').doc(userId);
            const userDoc = await userRef.get();

            if (!userDoc.exists) return null;

            const userData = userDoc.data();

            // Evaluate performance
            const performance = evaluatePerformance(attempt, userData);

            // Adjust difficulty recommendation
            const difficultyUpdate = adjustDifficulty(attempt, userData);

            // Update readiness score
            const readinessScore = updateReadinessScore(userData, attempt);

            // Update user profile
            const topicMastery = userData.topicMastery || {};
            topicMastery[attempt.topic] = {
                ...(topicMastery[attempt.topic] || {}),
                mastery: performance.newMastery,
                accuracy: performance.accuracy,
                attempts: (topicMastery[attempt.topic]?.attempts || 0) + 1,
                speedEfficiency: performance.speedEfficiency,
                lastPracticed: admin.firestore.FieldValue.serverTimestamp(),
            };

            // Check if new topics should be unlocked
            const unlockedTopics = userData.unlockedTopics || [];
            if (performance.newMastery >= 50 && difficultyUpdate.unlockNext) {
                const nextTopic = difficultyUpdate.nextTopicToUnlock;
                if (nextTopic && !unlockedTopics.includes(nextTopic)) {
                    unlockedTopics.push(nextTopic);
                }
            }

            await userRef.update({
                topicMastery,
                readinessScore,
                unlockedTopics,
                xp: admin.firestore.FieldValue.increment(performance.xpEarned || 0),
                lastActive: admin.firestore.FieldValue.serverTimestamp(),
            });

            return { success: true };
        } catch (error) {
            console.error('Error processing attempt:', error);
            return null;
        }
    });

// Daily streak check
exports.checkDailyStreak = functions.pubsub
    .schedule('every 24 hours')
    .onRun(async () => {
        const now = new Date();
        const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

        const usersSnapshot = await db.collection('users').get();

        const batch = db.batch();

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            const lastActive = data.lastActive?.toDate?.() || new Date(0);

            if (lastActive < yesterday) {
                batch.update(doc.ref, { streak: 0 });
            }
        });

        await batch.commit();
        return null;
    });
