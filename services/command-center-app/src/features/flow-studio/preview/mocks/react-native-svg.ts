import React from 'react'

// Mock SVG components
const createSvgComponent =
  (name: string) =>
  ({ children, ...props }: any) => {
    return React.createElement('svg', props, children)
  }

export const Svg = createSvgComponent('Svg')
export const Circle = createSvgComponent('circle')
export const Ellipse = createSvgComponent('ellipse')
export const G = createSvgComponent('g')
export const Text = createSvgComponent('text')
export const TSpan = createSvgComponent('tspan')
export const TextPath = createSvgComponent('textPath')
export const Path = createSvgComponent('path')
export const Polygon = createSvgComponent('polygon')
export const Polyline = createSvgComponent('polyline')
export const Line = createSvgComponent('line')
export const Rect = createSvgComponent('rect')
export const Use = createSvgComponent('use')
export const Image = createSvgComponent('image')
export const Symbol = createSvgComponent('symbol')
export const Defs = createSvgComponent('defs')
export const LinearGradient = createSvgComponent('linearGradient')
export const RadialGradient = createSvgComponent('radialGradient')
export const Stop = createSvgComponent('stop')
export const ClipPath = createSvgComponent('clipPath')
export const Pattern = createSvgComponent('pattern')
export const Mask = createSvgComponent('mask')

export default {
  Svg,
  Circle,
  Ellipse,
  G,
  Text,
  TSpan,
  TextPath,
  Path,
  Polygon,
  Polyline,
  Line,
  Rect,
  Use,
  Image,
  Symbol,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
  ClipPath,
  Pattern,
  Mask,
}
