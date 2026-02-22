// Adaptive Logic for Firebase Cloud Functions
// Implements: evaluatePerformance(), adjustDifficulty(), updateReadinessScore()

const ALL_TOPICS = [
    'percentage', 'profit-and-loss', 'ratio-and-proportion', 'averages',
    'time-and-work', 'time-speed-distance', 'interest', 'mixtures', 'number-system',
    'blood-relations', 'seating-arrangement', 'syllogism', 'coding-decoding',
    'direction-sense', 'data-sufficiency', 'statement-and-conclusion', 'logical-puzzles',
    'error-spotting', 'fill-in-the-blanks', 'para-jumbles', 'reading-comprehension', 'synonyms-antonyms',
];

/**
 * Evaluate the user's performance on a practice session
 */
function evaluatePerformance(attempt, userData) {
    const { score, accuracy, timeTaken, topic, difficulty } = attempt;

    const existingMastery = userData.topicMastery?.[topic]?.mastery || 0;

    // Calculate new mastery (weighted average of old and new)
    const newMastery = Math.min(100, Math.round(
        (existingMastery * 0.6) + (accuracy * 0.4)
    ));

    // Speed efficiency
    const expectedTime = difficulty === 'basic' ? 600 : difficulty === 'moderate' ? 450 : 300;
    const speedEfficiency = Math.min(expectedTime / (timeTaken || 1), 1.5);

    // XP calculation
    const baseXP = difficulty === 'basic' ? 50 : difficulty === 'moderate' ? 100 : 200;
    const xpEarned = Math.round(baseXP * (accuracy / 100) * Math.min(speedEfficiency, 1.5));

    return {
        newMastery,
        accuracy,
        speedEfficiency: Math.round(speedEfficiency * 100) / 100,
        xpEarned,
    };
}

/**
 * Determine if difficulty should be adjusted and if next topic should be unlocked
 */
function adjustDifficulty(attempt, userData) {
    const { topic, difficulty, accuracy } = attempt;
    const topicMastery = userData.topicMastery?.[topic] || {};

    let recommendedDifficulty = difficulty;
    let unlockNext = false;
    let nextTopicToUnlock = null;

    // If completed advanced mode with good accuracy, unlock next topic
    if (difficulty === 'advanced' && accuracy >= 70) {
        unlockNext = true;
        const topicIndex = ALL_TOPICS.indexOf(topic);
        if (topicIndex >= 0 && topicIndex < ALL_TOPICS.length - 1) {
            // Find next locked topic
            const unlockedTopics = userData.unlockedTopics || [];
            for (let i = topicIndex + 1; i < ALL_TOPICS.length; i++) {
                if (!unlockedTopics.includes(ALL_TOPICS[i])) {
                    nextTopicToUnlock = ALL_TOPICS[i];
                    break;
                }
            }
        }
    }

    // Recommend difficulty based on accuracy
    if (accuracy >= 85) {
        if (difficulty === 'basic') recommendedDifficulty = 'moderate';
        else if (difficulty === 'moderate') recommendedDifficulty = 'advanced';
    } else if (accuracy < 40) {
        if (difficulty === 'advanced') recommendedDifficulty = 'moderate';
        else if (difficulty === 'moderate') recommendedDifficulty = 'basic';
    }

    return {
        recommendedDifficulty,
        unlockNext,
        nextTopicToUnlock,
    };
}

/**
 * Calculate the placement readiness score
 * Score = (Accuracy × 0.4) + (Speed Efficiency × 0.2) + (Completion Rate × 0.2) + (Topic Coverage × 0.2)
 */
function updateReadinessScore(userData, attempt) {
    const topicMastery = userData.topicMastery || {};
    const masteryValues = Object.values(topicMastery);

    // Update with new attempt data
    const updatedMastery = { ...topicMastery };
    updatedMastery[attempt.topic] = {
        ...(updatedMastery[attempt.topic] || {}),
        accuracy: attempt.accuracy,
        mastery: Math.min(100, Math.round(
            ((updatedMastery[attempt.topic]?.mastery || 0) * 0.6) + (attempt.accuracy * 0.4)
        )),
        attempts: (updatedMastery[attempt.topic]?.attempts || 0) + 1,
    };

    const allValues = Object.values(updatedMastery);

    // Accuracy
    const accuracy = allValues.length > 0
        ? allValues.reduce((sum, m) => sum + (m.accuracy || 0), 0) / allValues.length / 100
        : 0;

    // Speed Efficiency
    const speedEfficiency = allValues.length > 0
        ? Math.min(allValues.reduce((sum, m) => sum + (m.speedEfficiency || 0.5), 0) / allValues.length, 1)
        : 0;

    // Completion Rate
    const completedTopics = allValues.filter(m => (m.attempts || 0) > 0).length;
    const completionRate = ALL_TOPICS.length > 0 ? completedTopics / ALL_TOPICS.length : 0;

    // Topic Coverage
    const topicCoverage = allValues.length > 0
        ? allValues.reduce((sum, m) => sum + (m.mastery || 0), 0) / (ALL_TOPICS.length * 100)
        : 0;

    const score = Math.round(
        (accuracy * 0.4 + speedEfficiency * 0.2 + completionRate * 0.2 + topicCoverage * 0.2) * 100
    );

    return Math.min(score, 100);
}

module.exports = {
    evaluatePerformance,
    adjustDifficulty,
    updateReadinessScore,
};
