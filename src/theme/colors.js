// Academic Color System - Calm, Institutional, Education-focused
export const colors = {
  // Primary Blues - Quantitative Aptitude
  quant: {
    primary: '#1B4F72',
    secondary: '#2471A3',
    light: '#D4E6F1',
    accent: '#2E86C1',
    bg: '#EBF5FB',
    dark: '#154360',
    text: '#1A3C5E',
  },

  // Greens - Logical Reasoning
  logical: {
    primary: '#1E6F50',
    secondary: '#27AE60',
    light: '#D5F5E3',
    accent: '#229954',
    bg: '#EAFAF1',
    dark: '#145A3C',
    text: '#1A5C3A',
  },

  // Teal/Muted Orange - Verbal Ability
  verbal: {
    primary: '#117A65',
    secondary: '#16A085',
    light: '#D1F2EB',
    accent: '#1ABC9C',
    bg: '#E8F8F5',
    dark: '#0E6655',
    text: '#0E5C4E',
  },

  // Neutral palette
  neutral: {
    50: '#FAFBFC',
    100: '#F4F6F8',
    200: '#E8ECF0',
    300: '#D1D8E0',
    400: '#A4B0BD',
    500: '#7B8D9E',
    600: '#5A6A7A',
    700: '#3D4F5F',
    800: '#2C3E50',
    900: '#1C2833',
  },

  // Background
  bg: {
    primary: '#FAFBFC',
    secondary: '#F0F3F6',
    card: '#FFFFFF',
    sidebar: '#F7F9FB',
    overlay: 'rgba(28, 40, 51, 0.6)',
  },

  // Semantic
  success: '#27AE60',
  warning: '#F39C12',
  error: '#E74C3C',
  info: '#2980B9',

  // XP & Gamification
  xp: {
    gold: '#D4A017',
    bronze: '#CD7F32',
    silver: '#A9A9A9',
    streak: '#E67E22',
    level: '#2471A3',
  },

  // Text
  text: {
    primary: '#1C2833',
    secondary: '#5A6A7A',
    muted: '#7B8D9E',
    inverse: '#FFFFFF',
    link: '#2471A3',
  },

  // Borders
  border: {
    light: '#E8ECF0',
    medium: '#D1D8E0',
    dark: '#A4B0BD',
  },
};

export const getCategoryColor = (category) => {
  switch (category?.toLowerCase()) {
    case 'quantitative':
    case 'quantitative aptitude':
      return colors.quant;
    case 'logical':
    case 'logical reasoning':
      return colors.logical;
    case 'verbal':
    case 'verbal ability':
      return colors.verbal;
    default:
      return colors.quant;
  }
};
