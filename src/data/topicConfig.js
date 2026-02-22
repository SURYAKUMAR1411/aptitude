export const CATEGORIES = [
    {
        id: 'quantitative',
        name: 'Quantitative Aptitude',
        shortName: 'Quantitative',
        icon: '📐',
        description: 'Master numerical problem-solving and mathematical reasoning',
        colorKey: 'quant',
    },
    {
        id: 'logical',
        name: 'Logical Reasoning',
        shortName: 'Logical',
        icon: '🧩',
        description: 'Develop analytical thinking and pattern recognition skills',
        colorKey: 'logical',
    },
    {
        id: 'verbal',
        name: 'Verbal Ability',
        shortName: 'Verbal',
        icon: '📝',
        description: 'Strengthen language comprehension and communication',
        colorKey: 'verbal',
    },
];

export const TOPICS = {
    quantitative: [
        { id: 'percentage', name: 'Percentage', icon: '📊', description: 'Calculate and compare percentages', hasGenerator: true },
        { id: 'profit-and-loss', name: 'Profit & Loss', icon: '💰', description: 'Cost price, selling price and profit calculations', hasGenerator: true },
        { id: 'ratio-and-proportion', name: 'Ratio & Proportion', icon: '⚖️', description: 'Compare quantities and proportional relationships', hasGenerator: true },
        { id: 'averages', name: 'Averages', icon: '📈', description: 'Mean, weighted average and related problems', hasGenerator: true },
        { id: 'time-and-work', name: 'Time & Work', icon: '⏰', description: 'Work rate, efficiency and combined work', hasGenerator: true },
        { id: 'time-speed-distance', name: 'Time Speed Distance', icon: '🚗', description: 'Speed, distance and relative motion', hasGenerator: true },
        { id: 'interest', name: 'Interest', icon: '🏦', description: 'Simple and compound interest calculations', hasGenerator: true },
        { id: 'mixtures', name: 'Mixtures', icon: '🧪', description: 'Alligation and mixture problems' },
        { id: 'number-system', name: 'Number System', icon: '🔢', description: 'Properties of numbers, divisibility, LCM/HCF' },
    ],
    logical: [
        { id: 'blood-relations', name: 'Blood Relations', icon: '👨‍👩‍👧‍👦', description: 'Family tree and relationship puzzles', interactive: 'family-tree' },
        { id: 'seating-arrangement', name: 'Seating Arrangement', icon: '💺', description: 'Circular and linear seating problems', interactive: 'seating-grid' },
        { id: 'syllogism', name: 'Syllogism', icon: '🔄', description: 'Logical deductions using Venn diagrams', interactive: 'venn-diagram' },
        { id: 'coding-decoding', name: 'Coding-Decoding', icon: '🔐', description: 'Pattern-based encoding and decoding' },
        { id: 'direction-sense', name: 'Direction Sense', icon: '🧭', description: 'Navigation and compass-based problems', interactive: 'compass' },
        { id: 'data-sufficiency', name: 'Data Sufficiency', icon: '📋', description: 'Determine if data is sufficient to solve' },
        { id: 'statement-and-conclusion', name: 'Statement & Conclusion', icon: '📜', description: 'Draw conclusions from given statements' },
        { id: 'logical-puzzles', name: 'Logical Puzzles', icon: '🧠', description: 'Complex multi-step logical puzzles' },
    ],
    verbal: [
        { id: 'error-spotting', name: 'Error Spotting', icon: '🔍', description: 'Identify grammatical and contextual errors' },
        { id: 'fill-in-the-blanks', name: 'Fill in the Blanks', icon: '✏️', description: 'Choose the correct word to complete sentences' },
        { id: 'para-jumbles', name: 'Para Jumbles', icon: '🔀', description: 'Rearrange sentences into coherent paragraphs', interactive: 'drag-reorder' },
        { id: 'reading-comprehension', name: 'Reading Comprehension', icon: '📖', description: 'Analyze passages and answer questions' },
        { id: 'synonyms-antonyms', name: 'Synonyms / Antonyms', icon: '🔤', description: 'Identify words with similar or opposite meanings' },
    ],
};

export const ALL_TOPICS = [
    ...TOPICS.quantitative.map(t => ({ ...t, category: 'quantitative' })),
    ...TOPICS.logical.map(t => ({ ...t, category: 'logical' })),
    ...TOPICS.verbal.map(t => ({ ...t, category: 'verbal' })),
];

export const getTopicById = (id) => ALL_TOPICS.find(t => t.id === id);
export const getTopicsByCategory = (category) => TOPICS[category] || [];

export const DIFFICULTY_CONFIG = {
    basic: {
        label: 'Basic',
        subtitle: 'Concept Mode',
        description: 'Learn core concepts with guided hints and step-by-step explanations',
        icon: '📘',
        color: '#2980B9',
        xpMultiplier: 1,
        timerEnabled: false,
        hintsEnabled: true,
        maxHints: 3,
    },
    moderate: {
        label: 'Moderate',
        subtitle: 'Practice Mode',
        description: 'Practice with mixed formats, limited hints, and timed challenges',
        icon: '📗',
        color: '#27AE60',
        xpMultiplier: 1.5,
        timerEnabled: true,
        hintsEnabled: true,
        maxHints: 1,
    },
    advanced: {
        label: 'Advanced',
        subtitle: 'Challenge Mode',
        description: 'Test yourself with strict timers, no hints, and boss-level questions',
        icon: '📕',
        color: '#E74C3C',
        xpMultiplier: 2.5,
        timerEnabled: true,
        hintsEnabled: false,
        maxHints: 0,
    },
};

export const MODE_UNLOCK_REQUIREMENTS = {
    basic: { minMastery: 0 },
    moderate: { minMastery: 30 },
    advanced: { minMastery: 60 },
};
