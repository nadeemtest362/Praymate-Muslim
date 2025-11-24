import React from 'react'

// Mock StatusBar component
export const StatusBar = ({ style, backgroundColor, ...props }: any) => {
  return null // StatusBar doesn't render anything on web
}

// Mock StatusBarStyle type
export type StatusBarStyle = 'auto' | 'inverted' | 'light' | 'dark'

// Mock other exports
export const setStatusBarStyle = (style: StatusBarStyle) => {}
export const setStatusBarBackgroundColor = (color: string) => {}
export const setStatusBarHidden = (hidden: boolean) => {}
export const setStatusBarTranslucent = (translucent: boolean) => {}
export const setStatusBarNetworkActivityIndicatorVisible = (
  visible: boolean
) => {}

export default StatusBar
