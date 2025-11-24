import React from 'react'

// Mock Animated API
export const FadeIn = { duration: () => ({}) }
export const FadeOut = { duration: () => ({}) }
export const FadeInDown = { duration: () => ({}) }
export const FadeInUp = { duration: () => ({}) }
export const SlideInDown = { duration: () => ({}) }
export const SlideInUp = { duration: () => ({}) }
export const SlideOutDown = { duration: () => ({}) }
export const SlideOutUp = { duration: () => ({}) }
export const ZoomIn = { duration: () => ({}) }
export const ZoomOut = { duration: () => ({}) }
export const BounceIn = { duration: () => ({}) }
export const BounceOut = { duration: () => ({}) }

export const withSpring = (value: number) => value
export const withTiming = (value: number) => value
export const withDelay = (delay: number, animation: any) => animation
export const withSequence = (...animations: any[]) => ({})
export const withRepeat = (animation: any) => animation

export const useSharedValue = (initialValue: any) => ({
  value: initialValue,
})

export const useAnimatedStyle = (styleWorklet: () => any) => {
  return styleWorklet()
}

export const useAnimatedProps = (propsWorklet: () => any) => {
  return propsWorklet()
}

export const interpolate = (
  value: number,
  inputRange: number[],
  outputRange: number[]
) => {
  return outputRange[0]
}

export const Extrapolate = {
  CLAMP: 'clamp',
  EXTEND: 'extend',
  IDENTITY: 'identity',
}

export const runOnJS = (fn: Function) => fn
export const runOnUI = (fn: Function) => fn

// Animated components
const createAnimatedComponent = (Component: any) => Component

export default {
  View: createAnimatedComponent('div'),
  Text: createAnimatedComponent('span'),
  ScrollView: createAnimatedComponent('div'),
  Image: createAnimatedComponent('img'),
  createAnimatedComponent,
}
