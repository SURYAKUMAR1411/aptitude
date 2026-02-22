// Placement Readiness Score Engine
// Score = (Accuracy × 0.4) + (Speed Efficiency × 0.2) + (Completion Rate × 0.2) + (Topic Coverage × 0.2)

import { ALL_TOPICS } from '../data/topicConfig';

export const calculateReadinessScore = (userProfile) => {
    if (!userProfile) return 0;

    const { topicMastery = {}, unlockedTopics = [] } = userProfile;

    // Accuracy: Average accuracy across all practiced topics
    const masteryValues = Object.values(topicMastery);
    const accuracy = masteryValues.length > 0
        ? masteryValues.reduce((sum, m) => sum + (m.accuracy || 0), 0) / masteryValues.length / 100
        : 0;

    // Speed Efficiency: Average speed across all topics (capped at 1)
    const speedEfficiency = masteryValues.length > 0
        ? Math.min(
            masteryValues.reduce((sum, m) => sum + (m.speedEfficiency || 0), 0) / masteryValues.length,
            1
        )
        : 0;

    // Completion Rate: Topics with at least one attempt / Total topics
    const totalTopics = ALL_TOPICS.length;
    const completedTopics = masteryValues.filter(m => (m.attempts || 0) > 0).length;
    const completionRate = totalTopics > 0 ? completedTopics / totalTopics : 0;

    // Topic Coverage: Average mastery level across all topics
    const topicCoverage = masteryValues.length > 0
        ? masteryValues.reduce((sum, m) => sum + (m.mastery || 0), 0) / (totalTopics * 100)
        : 0;

    const score = Math.round(
        (accuracy * 0.4 + speedEfficiency * 0.2 + completionRate * 0.2 + topicCoverage * 0.2) * 100
    );

    return Math.min(score, 100);
};

export const getReadinessLevel = (score) => {
    if (score >= 85) return { label: 'Placement Ready', color: '#27AE60', icon: '🎯' };
    if (score >= 70) return { label: 'Almost There', color: '#2471A3', icon: '📈' };
    if (score >= 50) return { label: 'Building Foundation', color: '#F39C12', icon: '🏗' };
    if (score >= 25) return { label: 'Getting Started', color: '#E67E22', icon: '🌱' };
    return { label: 'Beginner', color: '#95A5A6', icon: '📘' };
};

export const getTopicStrength = (mastery) => {
    if (mastery >= 80) return { label: 'Strong', color: '#27AE60' };
    if (mastery >= 60) return { label: 'Good', color: '#2471A3' };
    if (mastery >= 40) return { label: 'Average', color: '#F39C12' };
    if (mastery >= 20) return { label: 'Needs Work', color: '#E67E22' };
    return { label: 'Not Started', color: '#95A5A6' };
};
