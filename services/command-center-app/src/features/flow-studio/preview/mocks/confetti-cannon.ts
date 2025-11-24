import React from 'react'

interface ConfettiCannonProps {
  count?: number
  origin?: { x: number; y: number }
  explosionSpeed?: number
  fallSpeed?: number
  fadeOut?: boolean
  autoStart?: boolean
  onAnimationEnd?: () => void
  [key: string]: any
}

const ConfettiCannon: React.FC<ConfettiCannonProps> = ({
  count = 100,
  origin = { x: 0, y: 0 },
  explosionSpeed = 350,
  fallSpeed = 3000,
  fadeOut = false,
  autoStart = true,
  onAnimationEnd,
  ...props
}) => {
  React.useEffect(() => {
    if (autoStart && onAnimationEnd) {
      // Simulate animation end after a delay
      const timer = setTimeout(() => {
        onAnimationEnd()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [autoStart, onAnimationEnd])

  return React.createElement('div', {
    className: 'absolute inset-0 pointer-events-none overflow-hidden',
    style: { zIndex: 9999 },
    ...props,
    children: React.createElement('div', {
      className: 'animate-pulse text-center mt-20',
      children: React.createElement('span', {
        className: 'text-6xl',
        children: '🎉🎊✨',
      }),
    }),
  })
}

export default ConfettiCannon
