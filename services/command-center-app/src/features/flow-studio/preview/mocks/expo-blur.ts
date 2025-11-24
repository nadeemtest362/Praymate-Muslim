import React from 'react'

export const BlurView = ({
  intensity = 10,
  style,
  children,
  ...props
}: any) => {
  return React.createElement(
    'div',
    {
      style: {
        ...style,
        backdropFilter: `blur(${intensity}px)`,
        WebkitBackdropFilter: `blur(${intensity}px)`,
      },
      ...props,
    },
    children
  )
}
