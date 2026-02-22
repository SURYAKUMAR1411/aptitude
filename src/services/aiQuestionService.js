// AI Question Generation Service using Google Gemini API
// Hybrid approach: AI-generated + manual questions

import { GoogleGenerativeAI } from '@google/generative-ai';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

let genAI = null;
let model = null;

function initGemini() {
    if (!API_KEY) return false;
    if (!genAI) {
        genAI = new GoogleGenerativeAI(API_KEY);
        model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
    }
    return true;
}

// Topic-specific context for better AI question quality
const TOPIC_CONTEXT = {
    'percentage': 'percentages, percentage increase/decrease, successive percentages, finding original values',
    'profit-and-loss': 'cost price, selling price, profit percentage, loss percentage, marked price, discounts',
    'ratio-and-proportion': 'ratios, proportions, dividing amounts in ratios, compound ratios',
    'averages': 'arithmetic mean, weighted average, average speed, missing number problems',
    'time-and-work': 'work rate, efficiency, pipes and cisterns, combined work',
    'time-speed-distance': 'speed distance time, relative speed, average speed, trains, boats and streams',
    'interest': 'simple interest, compound interest, difference between SI and CI, installments',
    'mixtures': 'alligation, mixture replacement, concentration problems',
    'number-system': 'HCF, LCM, divisibility, remainders, prime numbers, factors',
    'blood-relations': 'family tree relationships, coded blood relations, puzzles',
    'seating-arrangement': 'circular arrangement, linear arrangement, direction facing',
    'syllogism': 'all/some/no statements, Venn diagram logic, conclusions',
    'coding-decoding': 'letter shifting, number coding, word coding patterns',
    'direction-sense': 'compass directions, distance and direction problems, shadow-based questions',
    'data-sufficiency': 'analyzing if given statements are sufficient to answer the question',
    'statement-and-conclusion': 'deriving logical conclusions from given statements',
    'logical-puzzles': 'arrangement puzzles, constraint-based logic, scheduling',
    'error-spotting': 'grammatical errors, subject-verb agreement, tense errors, preposition errors',
    'fill-in-the-blanks': 'vocabulary, idioms, contextual word usage, grammar',
    'para-jumbles': 'sentence ordering, paragraph coherence, logical flow',
    'reading-comprehension': 'passage analysis, inference, main idea, tone',
    'synonyms-antonyms': 'vocabulary, word meanings, opposite words, similar words',
};

const DIFFICULTY_PROMPTS = {
    basic: 'The question should be simple and straightforward, testing basic conceptual understanding. Suitable for beginners.',
    moderate: 'The question should be of medium difficulty with some complexity. It may involve 2-3 steps to solve.',
    advanced: 'The question should be challenging and tricky. It may involve multiple concepts, shortcuts, or common traps students fall into.',
};

/**
 * Generate questions using Google Gemini AI
 * @param {string} topic - Topic slug
 * @param {string} difficulty - basic, moderate, or advanced
 * @param {number} count - Number of questions to generate
 * @returns {Array} Array of question objects
 */
export async function generateAIQuestions(topic, difficulty, count = 5) {
    if (!initGemini()) {
        console.warn('Gemini API key not configured. Set VITE_GEMINI_API_KEY in .env');
        return [];
    }

    const topicContext = TOPIC_CONTEXT[topic] || topic.replace(/-/g, ' ');
    const difficultyGuide = DIFFICULTY_PROMPTS[difficulty] || DIFFICULTY_PROMPTS.basic;

    const prompt = `You are a placement exam question creator for Indian engineering students.

Generate exactly ${count} MCQ questions on the topic: "${topic.replace(/-/g, ' ')}" (specifically covering: ${topicContext}).

Difficulty: ${difficulty}. ${difficultyGuide}

Return ONLY a valid JSON array. Each question must be an object with these exact fields:
- "questionText": string (the question)
- "options": array of exactly 4 strings (answer choices)
- "correctAnswer": string (must exactly match one of the options)
- "explanation": string (step-by-step solution explanation)
- "trickHint": string (a shortcut or trick to solve faster)

Rules:
- Questions must be unique and varied
- All numerical answers must be precise
- Options should be plausible (not obviously wrong)
- Explanations should be clear and educational
- Trick hints should provide genuine shortcuts
- Do NOT include any markdown formatting, code fences, or extra text — just the JSON array

Example format:
[{"questionText":"What is 20% of 150?","options":["25","30","35","40"],"correctAnswer":"30","explanation":"20% of 150 = (20/100) × 150 = 30","trickHint":"20% = 1/5, so 150/5 = 30"}]`;

    try {
        const result = await model.generateContent(prompt);
        const text = result.response.text();

        // Extract JSON from response (handle cases where AI adds markdown fences)
        let jsonStr = text.trim();
        // Remove markdown code fences if present
        jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '');
        jsonStr = jsonStr.trim();

        const questions = JSON.parse(jsonStr);

        if (!Array.isArray(questions)) {
            console.warn('AI response is not an array');
            return [];
        }

        // Validate and format each question
        return questions
            .filter(q => q.questionText && q.options && q.correctAnswer && q.explanation)
            .map((q, index) => ({
                id: `ai-${topic}-${difficulty}-${Date.now()}-${index}`,
                topic,
                category: getCategory(topic),
                difficulty,
                type: 'mcq',
                questionText: q.questionText,
                options: q.options.slice(0, 4),
                correctAnswer: q.correctAnswer,
                explanation: q.explanation,
                trickHint: q.trickHint || 'Think step by step.',
                xpValue: difficulty === 'basic' ? 10 : difficulty === 'moderate' ? 25 : 50,
                timerValue: difficulty === 'basic' ? 60 : difficulty === 'moderate' ? 45 : 30,
                source: 'ai',
            }));
    } catch (error) {
        console.error('AI question generation failed:', error.message);
        return [];
    }
}

/**
 * Check if AI generation is available
 */
export function isAIAvailable() {
    return !!API_KEY;
}

function getCategory(topicSlug) {
    const quantTopics = ['percentage', 'profit-and-loss', 'ratio-and-proportion', 'averages', 'time-and-work', 'time-speed-distance', 'interest', 'mixtures', 'number-system'];
    const logicalTopics = ['blood-relations', 'seating-arrangement', 'syllogism', 'coding-decoding', 'direction-sense', 'data-sufficiency', 'statement-and-conclusion', 'logical-puzzles'];
    if (quantTopics.includes(topicSlug)) return 'quantitative';
    if (logicalTopics.includes(topicSlug)) return 'logical';
    return 'verbal';
}
