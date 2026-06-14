// Premium Typography System for Move-Me
// Uses Inter, SF Pro, and Geist font families

export const typography = {
  // Font Families
  fontFamily: {
    primary: 'SF Pro Display, SF Pro Text, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    mono: '"Monaco", "Courier New", monospace',
  },

  // Font Sizes
  fontSize: {
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },

  // Font Weights
  fontWeight: {
    light: 300,
    normal: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    extrabold: 800,
  },

  // Line Heights
  lineHeight: {
    tight: 1.2,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },

  // Letter Spacing
  letterSpacing: {
    tighter: -0.5,
    tight: -0.25,
    normal: 0,
    wide: 0.25,
    wider: 0.5,
    widest: 1,
  },

  // Predefined Text Styles
  styles: {
    // Headings
    h1: {
      fontSize: 48,
      fontWeight: 800,
      lineHeight: 1.2,
      letterSpacing: -1,
    },
    h2: {
      fontSize: 36,
      fontWeight: 700,
      lineHeight: 1.2,
      letterSpacing: -0.5,
    },
    h3: {
      fontSize: 30,
      fontWeight: 700,
      lineHeight: 1.3,
    },
    h4: {
      fontSize: 24,
      fontWeight: 700,
      lineHeight: 1.4,
    },

    // Subtitles
    subtitle1: {
      fontSize: 18,
      fontWeight: 600,
      lineHeight: 1.4,
    },
    subtitle2: {
      fontSize: 16,
      fontWeight: 600,
      lineHeight: 1.5,
    },

    // Body Text
    body1: {
      fontSize: 16,
      fontWeight: 400,
      lineHeight: 1.5,
    },
    body2: {
      fontSize: 14,
      fontWeight: 400,
      lineHeight: 1.5,
    },

    // Captions
    caption: {
      fontSize: 12,
      fontWeight: 500,
      lineHeight: 1.4,
    },
    captionSmall: {
      fontSize: 11,
      fontWeight: 500,
      lineHeight: 1.3,
    },

    // Buttons
    buttonLarge: {
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 1.5,
      letterSpacing: 0.3,
    },
    buttonMedium: {
      fontSize: 14,
      fontWeight: 700,
      lineHeight: 1.4,
      letterSpacing: 0.2,
    },
    buttonSmall: {
      fontSize: 12,
      fontWeight: 700,
      lineHeight: 1.3,
      letterSpacing: 0.1,
    },
  },
};
