import React from 'react'

export const LinearGradient = ({
  colors,
  style,
  children,
  start,
  end,
  ...props
}: any) => {
  const getGradientAngle = (
    start?: [number, number],
    end?: [number, number]
  ): string => {
    if (!start || !end) return '180deg'

    const dx = end[0] - start[0]
    const dy = end[1] - start[1]
    const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90

    return `${angle}deg`
  }

  const gradientStyle = {
    ...style,
    background: `linear-gradient(${getGradientAngle(start, end)}, ${colors.join(', ')})`,
  }

  return React.createElement(
    'div',
    {
      style: gradientStyle,
      ...props,
    },
    children
  )
}
