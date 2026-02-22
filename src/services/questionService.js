import { collection, query, where, getDocs, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { questionBank } from '../data/questionBank';
import { generateAIQuestions, isAIAvailable } from './aiQuestionService';

// ---- HYBRID QUESTION ENGINE ----
// Combines: 1) Pre-stored validated MCQs  2) Dynamic math generators  3) AI-generated via Gemini

// Fetch questions from Firestore (for production)
export const fetchQuestionsFromDB = async (topic, difficulty, limit = 10) => {
    try {
        const q = query(
            collection(db, 'questions'),
            where('topic', '==', topic),
            where('difficulty', '==', difficulty)
        );
        const snapshot = await getDocs(q);
        const questions = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        return shuffleArray(questions).slice(0, limit);
    } catch (error) {
        console.warn('Firestore fetch failed, using local bank:', error.message);
        return getLocalQuestions(topic, difficulty, limit);
    }
};

// Get questions from local bank (fallback / offline)
export const getLocalQuestions = (topic, difficulty, limit = 10) => {
    const topicSlug = topic.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, 'and');
    const bank = questionBank[topicSlug] || [];
    const filtered = bank.filter(q => q.difficulty === difficulty);

    if (filtered.length === 0) {
        return generateMathQuestions(topic, difficulty, limit);
    }

    return shuffleArray(filtered).slice(0, limit);
};

// Main hybrid function: local → math generators → AI (Gemini)
export const getQuestions = async (topic, difficulty, limit = 10) => {
    const collected = [];

    // Source 1: Local pre-stored question bank
    const local = getLocalQuestions(topic, difficulty, limit);
    collected.push(...local);

    // Source 2: Dynamic math-generated questions (fills remaining slots)
    if (collected.length < limit) {
        const generated = generateMathQuestions(topic, difficulty, limit - collected.length);
        collected.push(...generated);
    }

    // Source 3: AI-generated questions via Gemini (fills any remaining slots)
    if (collected.length < limit && isAIAvailable()) {
        try {
            const aiCount = Math.min(limit - collected.length, 5); // max 5 AI questions per batch
            const aiQuestions = await generateAIQuestions(topic, difficulty, aiCount);
            collected.push(...aiQuestions);
        } catch (err) {
            console.warn('AI question generation skipped:', err.message);
        }
    }

    return shuffleArray(collected).slice(0, limit);
};

// ---- DYNAMIC MATH QUESTION GENERATORS ----
const mathGenerators = {
    percentage: (difficulty) => {
        const configs = {
            basic: { max: 100, type: 'simple' },
            moderate: { max: 500, type: 'applied' },
            advanced: { max: 1000, type: 'complex' },
        };
        const cfg = configs[difficulty] || configs.basic;
        const num = randInt(10, cfg.max);
        const pct = [10, 15, 20, 25, 30, 40, 50, 60, 75][randInt(0, 8)];

        if (cfg.type === 'simple') {
            const answer = (num * pct) / 100;
            return {
                questionText: `What is ${pct}% of ${num}?`,
                options: generateOptions(answer, 4),
                correctAnswer: answer.toString(),
                explanation: `${pct}% of ${num} = (${pct}/100) × ${num} = ${answer}`,
                trickHint: `Break ${pct}% into simpler parts. E.g., ${pct / 2}% × 2`,
            };
        } else if (cfg.type === 'applied') {
            const price = randInt(100, 999);
            const discount = pct;
            const discountedPrice = price - (price * discount / 100);
            return {
                questionText: `A product costs ₹${price}. After a ${discount}% discount, what is the selling price?`,
                options: generateOptions(discountedPrice, 4),
                correctAnswer: discountedPrice.toString(),
                explanation: `Discount = ${discount}% of ${price} = ₹${(price * discount / 100)}. Selling price = ${price} - ${(price * discount / 100)} = ₹${discountedPrice}`,
                trickHint: `Calculate ${100 - discount}% of ${price} directly.`,
            };
        } else {
            const original = randInt(200, 999);
            const inc = pct;
            const dec = [5, 10, 15, 20][randInt(0, 3)];
            const afterInc = original * (1 + inc / 100);
            const final = afterInc * (1 - dec / 100);
            const finalRounded = Math.round(final * 100) / 100;
            return {
                questionText: `A value of ${original} is increased by ${inc}% and then decreased by ${dec}%. What is the final value?`,
                options: generateOptions(finalRounded, 4),
                correctAnswer: finalRounded.toString(),
                explanation: `After ${inc}% increase: ${afterInc}. After ${dec}% decrease: ${afterInc} × ${(100 - dec) / 100} = ${finalRounded}`,
                trickHint: `Net effect ≠ ${inc - dec}%. Multiply the factors: ${(100 + inc) / 100} × ${(100 - dec) / 100}`,
            };
        }
    },

    'profit-and-loss': (difficulty) => {
        const cp = randInt(100, 1000);
        const profitPct = randInt(5, 50);

        if (difficulty === 'basic') {
            const sp = cp + (cp * profitPct / 100);
            return {
                questionText: `A shopkeeper buys an item for ₹${cp} and sells it at ${profitPct}% profit. What is the selling price?`,
                options: generateOptions(sp, 4),
                correctAnswer: sp.toString(),
                explanation: `SP = CP + Profit = ${cp} + (${profitPct}% of ${cp}) = ${cp} + ${cp * profitPct / 100} = ₹${sp}`,
                trickHint: `SP = CP × (100 + profit%)/100`,
            };
        } else {
            const sp = randInt(cp - 200, cp + 500);
            const profitOrLoss = sp - cp;
            const pctVal = Math.abs(Math.round((profitOrLoss / cp) * 10000) / 100);
            const type = profitOrLoss >= 0 ? 'profit' : 'loss';
            return {
                questionText: `An article is bought for ₹${cp} and sold for ₹${sp}. Find the ${type} percentage.`,
                options: generateOptions(pctVal, 4),
                correctAnswer: pctVal.toString(),
                explanation: `${type.charAt(0).toUpperCase() + type.slice(1)} = SP - CP = ${sp} - ${cp} = ₹${Math.abs(profitOrLoss)}. ${type}% = (${Math.abs(profitOrLoss)}/${cp}) × 100 = ${pctVal}%`,
                trickHint: `${type}% = (${type === 'profit' ? 'SP - CP' : 'CP - SP'} / CP) × 100`,
            };
        }
    },

    'ratio-and-proportion': (difficulty) => {
        const a = randInt(2, 12);
        const b = randInt(2, 12);
        const total = randInt(50, 500);

        if (difficulty === 'basic') {
            const shareA = Math.round((a / (a + b)) * total);
            return {
                questionText: `Divide ${total} in the ratio ${a}:${b}. What is the larger share?`,
                options: generateOptions(Math.max(shareA, total - shareA), 4),
                correctAnswer: Math.max(shareA, total - shareA).toString(),
                explanation: `Total parts = ${a + b}. Share of ${a} = (${a}/${a + b}) × ${total} = ${shareA}. Share of ${b} = ${total - shareA}.`,
                trickHint: `Divide total by sum of ratio terms, then multiply each part.`,
            };
        } else {
            const c = randInt(2, 8);
            const totalParts = a + b + c;
            const shareB = Math.round((b / totalParts) * total);
            return {
                questionText: `₹${total} is divided among A, B, C in the ratio ${a}:${b}:${c}. What does B get?`,
                options: generateOptions(shareB, 4),
                correctAnswer: shareB.toString(),
                explanation: `Total parts = ${totalParts}. B's share = (${b}/${totalParts}) × ${total} = ₹${shareB}`,
                trickHint: `Each part = Total ÷ Sum of ratio terms`,
            };
        }
    },

    'averages': (difficulty) => {
        const count = difficulty === 'basic' ? 5 : difficulty === 'moderate' ? 7 : 10;
        const nums = Array.from({ length: count }, () => randInt(10, 100));
        const sum = nums.reduce((s, n) => s + n, 0);
        const avg = Math.round((sum / count) * 100) / 100;

        return {
            questionText: `Find the average of: ${nums.join(', ')}`,
            options: generateOptions(avg, 4),
            correctAnswer: avg.toString(),
            explanation: `Sum = ${sum}. Average = ${sum} ÷ ${count} = ${avg}`,
            trickHint: `Average = Sum of all values ÷ Number of values`,
        };
    },

    'time-and-work': (difficulty) => {
        const daysA = randInt(6, 20);
        const daysB = randInt(6, 20);

        if (difficulty === 'basic') {
            return {
                questionText: `A can do a piece of work in ${daysA} days. How much work does A do in 1 day?`,
                options: [`1/${daysA}`, `1/${daysA + 1}`, `${daysA}`, `1/${daysA - 1}`],
                correctAnswer: `1/${daysA}`,
                explanation: `If A completes work in ${daysA} days, A does 1/${daysA} of the work per day.`,
                trickHint: `Work done per day = 1 / Total days`,
            };
        } else {
            const lcm = getLCM(daysA, daysB);
            const rateA = lcm / daysA;
            const rateB = lcm / daysB;
            const together = Math.round((lcm / (rateA + rateB)) * 100) / 100;
            return {
                questionText: `A can finish a job in ${daysA} days, B in ${daysB} days. Working together, how many days will they take?`,
                options: generateOptions(together, 4),
                correctAnswer: together.toString(),
                explanation: `A's rate = 1/${daysA}, B's rate = 1/${daysB}. Together = 1/${daysA} + 1/${daysB} = ${rateA + rateB}/${lcm}. Days = ${lcm}/${rateA + rateB} = ${together}`,
                trickHint: `Combined rate = Sum of individual rates. Time = 1/Combined rate`,
            };
        }
    },

    'time-speed-distance': (difficulty) => {
        const speed = randInt(20, 120);
        const time = randInt(1, 10);
        const distance = speed * time;

        if (difficulty === 'basic') {
            return {
                questionText: `A car travels at ${speed} km/h for ${time} hours. What distance does it cover?`,
                options: generateOptions(distance, 4),
                correctAnswer: distance.toString(),
                explanation: `Distance = Speed × Time = ${speed} × ${time} = ${distance} km`,
                trickHint: `D = S × T`,
            };
        } else {
            const speed2 = randInt(20, 100);
            const avgSpeed = Math.round((2 * speed * speed2) / (speed + speed2) * 100) / 100;
            return {
                questionText: `A person goes from A to B at ${speed} km/h and returns at ${speed2} km/h. What is the average speed for the entire journey?`,
                options: generateOptions(avgSpeed, 4),
                correctAnswer: avgSpeed.toString(),
                explanation: `Average speed for equal distances = 2×S1×S2/(S1+S2) = 2×${speed}×${speed2}/(${speed}+${speed2}) = ${avgSpeed} km/h`,
                trickHint: `For equal distances, average speed = 2×S1×S2/(S1+S2), NOT (S1+S2)/2`,
            };
        }
    },

    'interest': (difficulty) => {
        const principal = [1000, 2000, 5000, 8000, 10000, 15000][randInt(0, 5)];
        const rate = [5, 6, 8, 10, 12, 15][randInt(0, 5)];
        const time = randInt(1, 5);

        if (difficulty === 'basic' || difficulty === 'moderate') {
            const si = (principal * rate * time) / 100;
            return {
                questionText: `Find the Simple Interest on ₹${principal} at ${rate}% per annum for ${time} years.`,
                options: generateOptions(si, 4),
                correctAnswer: si.toString(),
                explanation: `SI = (P × R × T)/100 = (${principal} × ${rate} × ${time})/100 = ₹${si}`,
                trickHint: `SI = PRT/100`,
            };
        } else {
            const ci = Math.round(principal * Math.pow(1 + rate / 100, time) - principal);
            return {
                questionText: `Find the Compound Interest on ₹${principal} at ${rate}% p.a. for ${time} years, compounded annually.`,
                options: generateOptions(ci, 4),
                correctAnswer: ci.toString(),
                explanation: `CI = P(1+R/100)^T - P = ${principal}(1+${rate}/100)^${time} - ${principal} = ₹${ci}`,
                trickHint: `CI = P[(1+R/100)^T - 1]`,
            };
        }
    },
};

function generateMathQuestions(topic, difficulty, count) {
    const topicSlug = topic.toLowerCase().replace(/\s+/g, '-').replace(/[&]/g, 'and');
    const generator = mathGenerators[topicSlug];
    if (!generator) return [];

    const questions = [];
    for (let i = 0; i < count; i++) {
        const q = generator(difficulty);
        questions.push({
            id: `gen-${topicSlug}-${difficulty}-${Date.now()}-${i}`,
            topic: topicSlug,
            category: getCategory(topicSlug),
            difficulty,
            type: 'mcq',
            xpValue: difficulty === 'basic' ? 10 : difficulty === 'moderate' ? 25 : 50,
            timerValue: difficulty === 'basic' ? 60 : difficulty === 'moderate' ? 45 : 30,
            ...q,
        });
    }
    return questions;
}

// ---- UTILITY FUNCTIONS ----
function randInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffleArray(arr) {
    const shuffled = [...arr];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

function generateOptions(correct, count = 4) {
    const correctNum = parseFloat(correct);
    if (isNaN(correctNum)) return [correct.toString()];

    const options = new Set();
    options.add(correctNum.toString());

    while (options.size < count) {
        const variation = correctNum + randInt(-Math.max(5, Math.abs(Math.floor(correctNum * 0.3))), Math.max(5, Math.abs(Math.floor(correctNum * 0.3))));
        if (variation !== correctNum && variation > 0) {
            options.add(Math.round(variation * 100) / 100 + '');
        }
    }

    return shuffleArray([...options]);
}

function getLCM(a, b) {
    const gcd = (x, y) => y ? gcd(y, x % y) : x;
    return (a * b) / gcd(a, b);
}

function getCategory(topicSlug) {
    const quantTopics = ['percentage', 'profit-and-loss', 'ratio-and-proportion', 'averages', 'time-and-work', 'time-speed-distance', 'interest', 'mixtures', 'number-system'];
    const logicalTopics = ['blood-relations', 'seating-arrangement', 'syllogism', 'coding-decoding', 'direction-sense', 'data-sufficiency', 'statement-and-conclusion', 'logical-puzzles'];
    const verbalTopics = ['error-spotting', 'fill-in-the-blanks', 'para-jumbles', 'reading-comprehension', 'synonyms-antonyms'];

    if (quantTopics.includes(topicSlug)) return 'quantitative';
    if (logicalTopics.includes(topicSlug)) return 'logical';
    if (verbalTopics.includes(topicSlug)) return 'verbal';
    return 'quantitative';
}

// Save attempt to Firestore
export const saveAttempt = async (userId, attemptData) => {
    try {
        const attemptRef = doc(collection(db, 'attempts'));
        await setDoc(attemptRef, {
            ...attemptData,
            userId,
            date: serverTimestamp(),
        });
        return attemptRef.id;
    } catch (error) {
        console.warn('Failed to save attempt to Firestore:', error.message);
        return null;
    }
};
