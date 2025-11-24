import React from 'react'
// Icon mappings (using lucide-react icons)
import * as LucideIcons from 'lucide-react'
import { cn } from '@/lib/utils'

// React Native component mappings for web
export const View = ({ style, className, children, ...props }: any) => (
  <div
    className={cn('flex flex-col', className)}
    style={transformStyle(style)}
    {...props}
  >
    {children}
  </div>
)

export const Text = ({ style, className, children, ...props }: any) => (
  <span
    className={cn('block', className)}
    style={transformStyle(style)}
    {...props}
  >
    {children}
  </span>
)

export const TouchableOpacity = ({
  onPress,
  style,
  className,
  children,
  activeOpacity = 0.7,
  ...props
}: any) => (
  <button
    onClick={onPress}
    className={cn(
      'transition-opacity hover:opacity-70 focus:outline-none',
      className
    )}
    style={{
      ...transformStyle(style),
      opacity: 1,
      background: 'transparent',
      border: 'none',
      padding: 0,
      cursor: 'pointer',
    }}
    onMouseDown={(e) => (e.currentTarget.style.opacity = String(activeOpacity))}
    onMouseUp={(e) => (e.currentTarget.style.opacity = '1')}
    onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
    {...props}
  >
    {children}
  </button>
)

export const ScrollView = ({
  style,
  contentContainerStyle,
  children,
  ...props
}: any) => (
  <div className='overflow-auto' style={transformStyle(style)} {...props}>
    <div style={transformStyle(contentContainerStyle)}>{children}</div>
  </div>
)

export const Image = ({ source, style, ...props }: any) => (
  <img
    src={typeof source === 'object' ? source.uri : source}
    style={transformStyle(style)}
    alt=''
    {...props}
  />
)

export const ActivityIndicator = ({
  size = 'small',
  color = '#999',
  ...props
}: any) => {
  const sizeClasses: Record<string, string> = {
    small: 'h-4 w-4',
    large: 'h-8 w-8',
  }

  return (
    <div
      className={cn(
        'animate-spin rounded-full border-2 border-t-transparent',
        sizeClasses[size] || sizeClasses.small
      )}
      style={{ borderColor: color, borderTopColor: 'transparent' }}
      {...props}
    />
  )
}

export const TextInput = ({
  value,
  onChangeText,
  placeholder,
  style,
  ...props
}: any) => (
  <input
    type='text'
    value={value}
    onChange={(e) => onChangeText?.(e.target.value)}
    placeholder={placeholder}
    className='focus:ring-primary rounded-lg border px-3 py-2 focus:ring-2 focus:outline-none'
    style={transformStyle(style)}
    {...props}
  />
)

export const FlatList = ({
  data,
  renderItem,
  keyExtractor,
  ItemSeparatorComponent,
  ...props
}: any) => (
  <div {...props}>
    {data?.map((item: any, index: number) => (
      <React.Fragment key={keyExtractor ? keyExtractor(item, index) : index}>
        {renderItem({ item, index })}
        {ItemSeparatorComponent && index < data.length - 1 && (
          <ItemSeparatorComponent />
        )}
      </React.Fragment>
    ))}
  </div>
)

// Linear Gradient component
export const LinearGradient = ({
  colors,
  style,
  children,
  start,
  end,
  ...props
}: any) => {
  const gradientStyle = {
    ...transformStyle(style),
    background: `linear-gradient(${getGradientAngle(start, end)}, ${colors.join(', ')})`,
  }

  return (
    <div style={gradientStyle} {...props}>
      {children}
    </div>
  )
}

// BlurView component
export const BlurView = ({
  intensity = 10,
  style,
  children,
  ...props
}: any) => (
  <div
    style={{
      ...transformStyle(style),
      backdropFilter: `blur(${intensity}px)`,
      WebkitBackdropFilter: `blur(${intensity}px)`,
    }}
    {...props}
  >
    {children}
  </div>
)

// StyleSheet compatibility
export const StyleSheet = {
  create: (styles: any) => styles,
  absoluteFillObject: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  hairlineWidth: 1,
}

// Dimensions API
export const Dimensions = {
  get: (dim: string) => {
    if (dim === 'window') {
      return {
        width: typeof window !== 'undefined' ? window.innerWidth : 375,
        height: typeof window !== 'undefined' ? window.innerHeight : 812,
      }
    }
    return { width: 375, height: 812 }
  },
}

// Platform API
export const Platform = {
  OS: 'web',
  select: (obj: any) => obj.web || obj.default || obj.ios,
}

// Safe area hooks
export const useSafeAreaInsets = () => ({
  top: 20,
  bottom: 20,
  left: 0,
  right: 0,
})

// Haptics mock
export const Haptics = {
  impactAsync: async () => {},
  notificationAsync: async () => {},
  selectionAsync: async () => {},
}

// Alert mock
export const Alert = {
  alert: (title: string, message?: string, buttons?: any[]) => {
    window.alert(`${title}\n${message || ''}`)
  },
}

// Transform React Native styles to CSS
function transformStyle(style: any): React.CSSProperties {
  if (!style) return {}

  const styleArray = Array.isArray(style) ? style : [style]
  const merged = Object.assign({}, ...styleArray)

  const cssStyle: any = {}

  for (const [key, value] of Object.entries(merged)) {
    switch (key) {
      case 'flex':
        cssStyle.flex = value
        break
      case 'flexDirection':
        cssStyle.flexDirection = value as any
        break
      case 'justifyContent':
        cssStyle.justifyContent = transformAlignment(value as string)
        break
      case 'alignItems':
        cssStyle.alignItems = transformAlignment(value as string)
        break
      case 'alignSelf':
        cssStyle.alignSelf = transformAlignment(value as string)
        break
      case 'marginHorizontal':
        cssStyle.marginLeft = value
        cssStyle.marginRight = value
        break
      case 'marginVertical':
        cssStyle.marginTop = value
        cssStyle.marginBottom = value
        break
      case 'paddingHorizontal':
        cssStyle.paddingLeft = value
        cssStyle.paddingRight = value
        break
      case 'paddingVertical':
        cssStyle.paddingTop = value
        cssStyle.paddingBottom = value
        break
      default:
        cssStyle[key] = value
    }
  }

  return cssStyle
}

function transformAlignment(value: string): string {
  const alignmentMap: Record<string, string> = {
    'flex-start': 'flex-start',
    'flex-end': 'flex-end',
    center: 'center',
    stretch: 'stretch',
    'space-between': 'space-between',
    'space-around': 'space-around',
    'space-evenly': 'space-evenly',
  }
  return alignmentMap[value] || value
}

function getGradientAngle(
  start?: [number, number],
  end?: [number, number]
): string {
  if (!start || !end) return '180deg'

  const dx = end[0] - start[0]
  const dy = end[1] - start[1]
  const angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90

  return `${angle}deg`
}

// Mock for react-native-confetti-cannon
export const ConfettiCannon = ({
  count = 100,
  origin = { x: 0, y: 0 },
  explosionSpeed = 350,
  fallSpeed = 3000,
  fadeOut = false,
  autoStart = true,
  onAnimationEnd,
  ...props
}: any) => {
  React.useEffect(() => {
    if (autoStart && onAnimationEnd) {
      // Simulate animation end after a delay
      const timer = setTimeout(() => {
        onAnimationEnd()
      }, 2000)
      return () => clearTimeout(timer)
    }
  }, [autoStart, onAnimationEnd])

  return (
    <div className='pointer-events-none absolute inset-0 overflow-hidden'>
      <div className='mt-20 animate-pulse text-center'>
        <span className='text-4xl'>🎉</span>
      </div>
    </div>
  )
}

// Appearance API mock
export const Appearance = {
  getColorScheme: () => 'light' as 'light' | 'dark' | null,
  addChangeListener: (listener: any) => ({
    remove: () => {},
  }),
  removeChangeListener: (listener: any) => {},
}

// useColorScheme hook
export const useColorScheme = () => {
  return 'light' as 'light' | 'dark' | null
}

// StatusBar mock
export const StatusBar = {
  setBarStyle: (style: string) => {},
  setBackgroundColor: (color: string) => {},
  setHidden: (hidden: boolean) => {},
  setTranslucent: (translucent: boolean) => {},
  pushStackEntry: (props: any) => ({ id: Math.random() }),
  popStackEntry: (entry: any) => {},
  replaceStackEntry: (entry: any, props: any) => entry,
  currentHeight: 44,
}

export const Ionicons = createIconSet(LucideIcons)
export const AntDesign = createIconSet(LucideIcons)
export const FontAwesome = createIconSet(LucideIcons)
export const MaterialIcons = createIconSet(LucideIcons)

function createIconSet(iconLib: any) {
  return {
    Button: ({ name, size = 24, color = 'currentColor', ...props }: any) => {
      // Map common icon names to lucide equivalents
      const iconMap: Record<string, string> = {
        'chevron-forward': 'ChevronRight',
        'chevron-back': 'ChevronLeft',
        close: 'X',
        checkmark: 'Check',
        add: 'Plus',
        person: 'User',
        people: 'Users',
        time: 'Clock',
        calendar: 'Calendar',
        heart: 'Heart',
        star: 'Star',
        home: 'Home',
        settings: 'Settings',
        search: 'Search',
        filter: 'Filter',
      }

      const IconComponent = iconLib[iconMap[name] || 'Circle']

      return IconComponent ? (
        <IconComponent size={size} color={color} {...props} />
      ) : (
        <div
          style={{
            width: size,
            height: size,
            backgroundColor: color,
            borderRadius: '50%',
          }}
        />
      )
    },
  }
}
