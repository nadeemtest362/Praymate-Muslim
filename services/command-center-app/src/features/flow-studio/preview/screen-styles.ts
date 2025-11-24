// Extracted styles from actual SDUI components for preview rendering

export const screenStyles = {
  // Primary gradient used across most screens
  primaryGradient: {
    colors: ['#1A1B4B', '#2D1B69', '#4A4E83', '#6B7DB8'],
    angle: '135deg',
  },

  // Screen-specific gradients
  gradients: {
    welcome: {
      overlay: [
        'rgba(139, 69, 19, 0.1)',
        'transparent',
        'rgba(30, 144, 255, 0.1)',
      ],
    },
    prayerExample: {
      colors: ['#003366', '#B94A5A', '#FF8C42'],
      angle: '135deg',
    },
  },

  // Typography
  text: {
    title: {
      fontSize: '2rem',
      fontWeight: '700',
      color: '#FFFFFF',
      letterSpacing: '-0.05em',
      textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    },
    subtitle: {
      fontSize: '1.125rem',
      fontWeight: '500',
      color: 'rgba(255, 255, 255, 0.85)',
      lineHeight: '1.5',
    },
    accent: {
      color: '#7DD3FC',
      fontWeight: '800',
    },
  },

  // Glass morphism cards
  card: {
    background: 'rgba(255, 255, 255, 0.12)',
    backdropFilter: 'blur(15px)',
    border: '1px solid rgba(255, 255, 255, 0.25)',
    borderRadius: '1rem',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
  },

  // Selected state
  cardSelected: {
    background: 'rgba(108, 99, 255, 0.35)',
    borderColor: '#6C63FF',
    transform: 'scale(1.02)',
  },

  // Buttons
  button: {
    primary: {
      background: '#FFFFFF',
      color: '#1A1B4B',
      borderRadius: '1.5rem',
      padding: '1rem 2rem',
      fontWeight: '600',
    },
    secondary: {
      background: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(10px)',
      color: '#FFFFFF',
      border: '1px solid rgba(255, 255, 255, 0.3)',
      borderRadius: '1.5rem',
      padding: '1rem 2rem',
    },
  },

  // Animations (CSS equivalents)
  animations: {
    fadeIn: {
      animation: 'fadeIn 0.6s ease-out',
    },
    slideUp: {
      animation: 'slideUp 0.5s ease-out',
    },
    scale: {
      animation: 'scale 0.3s ease-out',
    },
    glow: {
      animation: 'glow 2.5s ease-in-out infinite',
    },
  },
}

// CSS animation keyframes to be injected
export const animationKeyframes = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0;
      transform: translateY(20px);
    }
    to { 
      opacity: 1;
      transform: translateY(0);
    }
  }
  
  @keyframes scale {
    from { transform: scale(0.9); }
    to { transform: scale(1); }
  }
  
  @keyframes glow {
    0%, 100% { transform: scale(1); opacity: 1; }
    50% { transform: scale(1.05); opacity: 0.8; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0) translateX(0); }
    25% { transform: translateY(-10px) translateX(5px); }
    50% { transform: translateY(-20px) translateX(-5px); }
    75% { transform: translateY(-10px) translateX(3px); }
  }
`
