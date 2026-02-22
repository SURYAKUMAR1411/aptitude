// Adaptive Difficulty Engine
// 3 consecutive correct → increase difficulty
// 2 consecutive wrong → show hint and decrease difficulty

export class AdaptiveEngine {
    constructor() {
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        this.currentDifficulty = 'basic';
        this.difficultyLevels = ['basic', 'moderate', 'advanced'];
        this.showHint = false;
        this.history = [];
    }

    recordAnswer(isCorrect, timeTaken, expectedTime) {
        this.history.push({ isCorrect, timeTaken, expectedTime, difficulty: this.currentDifficulty });

        if (isCorrect) {
            this.consecutiveCorrect++;
            this.consecutiveWrong = 0;
            this.showHint = false;
        } else {
            this.consecutiveWrong++;
            this.consecutiveCorrect = 0;
        }

        this.adjustDifficulty();

        return {
            newDifficulty: this.currentDifficulty,
            shouldShowHint: this.showHint,
            streak: this.consecutiveCorrect,
        };
    }

    adjustDifficulty() {
        const currentIndex = this.difficultyLevels.indexOf(this.currentDifficulty);

        if (this.consecutiveCorrect >= 3) {
            if (currentIndex < this.difficultyLevels.length - 1) {
                this.currentDifficulty = this.difficultyLevels[currentIndex + 1];
                this.consecutiveCorrect = 0;
            }
        }

        if (this.consecutiveWrong >= 2) {
            this.showHint = true;
            if (currentIndex > 0) {
                this.currentDifficulty = this.difficultyLevels[currentIndex - 1];
                this.consecutiveWrong = 0;
            }
        }
    }

    getStats() {
        const total = this.history.length;
        const correct = this.history.filter(h => h.isCorrect).length;
        const accuracy = total > 0 ? (correct / total) * 100 : 0;

        const avgTime = total > 0
            ? this.history.reduce((sum, h) => sum + h.timeTaken, 0) / total
            : 0;

        const avgExpected = total > 0
            ? this.history.reduce((sum, h) => sum + h.expectedTime, 0) / total
            : 0;

        const speedEfficiency = avgTime > 0 ? Math.min(avgExpected / avgTime, 1.5) : 0;

        return {
            total,
            correct,
            accuracy: Math.round(accuracy * 100) / 100,
            avgTime: Math.round(avgTime * 100) / 100,
            speedEfficiency: Math.round(speedEfficiency * 100) / 100,
            currentDifficulty: this.currentDifficulty,
        };
    }

    calculateXP(baseXP, isCorrect, timeTaken, expectedTime) {
        if (!isCorrect) return 0;

        let xp = baseXP;

        // Speed bonus
        if (timeTaken < expectedTime * 0.5) {
            xp *= 2;
        } else if (timeTaken < expectedTime * 0.75) {
            xp *= 1.5;
        }

        // Streak multiplier
        if (this.consecutiveCorrect >= 5) {
            xp *= 2;
        } else if (this.consecutiveCorrect >= 3) {
            xp *= 1.5;
        }

        // Difficulty multiplier
        const diffMultiplier = { basic: 1, moderate: 1.5, advanced: 2.5 };
        xp *= (diffMultiplier[this.currentDifficulty] || 1);

        return Math.round(xp);
    }

    reset() {
        this.consecutiveCorrect = 0;
        this.consecutiveWrong = 0;
        this.currentDifficulty = 'basic';
        this.showHint = false;
        this.history = [];
    }
}

export const calculateLevel = (xp) => {
    // Level thresholds: 0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000
    const thresholds = [0, 100, 250, 500, 1000, 2000, 3500, 5500, 8000, 11000, 15000];
    let level = 1;
    for (let i = 1; i < thresholds.length; i++) {
        if (xp >= thresholds[i]) {
            level = i + 1;
        } else {
            break;
        }
    }
    return {
        level,
        currentXP: xp,
        nextLevelXP: thresholds[level] || thresholds[thresholds.length - 1] + 5000,
        progress: level < thresholds.length
            ? ((xp - thresholds[level - 1]) / (thresholds[level] - thresholds[level - 1])) * 100
            : 100,
    };
};
