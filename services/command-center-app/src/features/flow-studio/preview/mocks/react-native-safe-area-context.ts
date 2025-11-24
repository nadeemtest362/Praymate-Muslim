import React from 'react'

export const useSafeAreaInsets = () => ({
  top: 20,
  bottom: 20,
  left: 0,
  right: 0,
})

export const SafeAreaProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  return React.createElement(React.Fragment, null, children)
}

export const SafeAreaView = ({ children, style, ...props }: any) => {
  return React.createElement(
    'div',
    {
      style: {
        paddingTop: 20,
        paddingBottom: 20,
        ...style,
      },
      ...props,
    },
    children
  )
}
