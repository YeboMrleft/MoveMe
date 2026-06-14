// Spacing & Layout System for Move-Me
// 8-point grid system for consistency

export const spacing = {
  // Base spacing unit (8px)
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  16: 64,
  20: 80,
  24: 96,
};

export const sizes = {
  // Component sizes
  buttonHeight: {
    sm: 36,
    md: 44,
    lg: 52,
    xl: 60,
  },

  inputHeight: {
    sm: 36,
    md: 44,
    lg: 52,
  },

  iconSize: {
    xs: 16,
    sm: 20,
    md: 24,
    lg: 32,
    xl: 40,
  },

  // Responsive breakpoints
  breakpoint: {
    xs: 320,
    sm: 375,
    md: 768,
    lg: 1024,
    xl: 1280,
  },
};

export const radius = {
  // Border radius scale
  none: 0,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  full: 9999,
};

export const shadows = {
  // Premium shadow system
  none: 'none',
  sm: '0 1px 2px 0 rgba(15, 23, 42, 0.05)',
  md: '0 4px 6px -1px rgba(15, 23, 42, 0.1), 0 2px 4px -1px rgba(15, 23, 42, 0.06)',
  lg: '0 10px 15px -3px rgba(15, 23, 42, 0.1), 0 4px 6px -2px rgba(15, 23, 42, 0.05)',
  xl: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 10px 10px -5px rgba(15, 23, 42, 0.04)',
  '2xl': '0 25px 50px -12px rgba(15, 23, 42, 0.15)',

  // Elevation shadows
  elevation: {
    low: '0 2px 8px rgba(15, 23, 42, 0.08)',
    medium: '0 4px 16px rgba(15, 23, 42, 0.12)',
    high: '0 12px 32px rgba(15, 23, 42, 0.16)',
  },
};

export const transitions = {
  // Animation timings
  duration: {
    fastest: 50,
    faster: 100,
    fast: 150,
    normal: 200,
    slow: 300,
    slower: 400,
    slowest: 500,
  },

  easing: {
    easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
    easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
    ease: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  },
};
