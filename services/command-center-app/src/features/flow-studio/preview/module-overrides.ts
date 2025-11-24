// Module overrides for React Native packages in web environment

// Override react-native-confetti-cannon
if (typeof window !== 'undefined') {
  // @ts-ignore
  window.__moduleOverrides = {
    'react-native-confetti-cannon': {
      default: ({
        count = 100,
        origin = { x: 0, y: 0 },
        explosionSpeed = 350,
        fallSpeed = 3000,
        fadeOut = false,
        autoStart = true,
        onAnimationEnd,
        ...props
      }: any) => {
        const React = require('react')
        React.useEffect(() => {
          if (autoStart && onAnimationEnd) {
            const timer = setTimeout(() => {
              onAnimationEnd()
            }, 2000)
            return () => clearTimeout(timer)
          }
        }, [autoStart, onAnimationEnd])

        return React.createElement('div', {
          className: 'absolute inset-0 pointer-events-none overflow-hidden',
          children: React.createElement('div', {
            className: 'animate-pulse text-center mt-20',
            children: React.createElement('span', {
              className: 'text-4xl',
              children: '🎉',
            }),
          }),
        })
      },
    },
  }
}

export {}
