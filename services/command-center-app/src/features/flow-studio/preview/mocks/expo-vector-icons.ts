import React from 'react'
import * as LucideIcons from 'lucide-react'

// Map common icon names to lucide equivalents
const iconMap: Record<string, string> = {
  'chevron-forward': 'ChevronRight',
  'chevron-back': 'ChevronLeft',
  close: 'X',
  'close-circle': 'XCircle',
  checkmark: 'Check',
  'checkmark-circle': 'CheckCircle',
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
  flame: 'Flame',
  trophy: 'Trophy',
  gift: 'Gift',
  book: 'Book',
  edit: 'Edit',
  trash: 'Trash',
  share: 'Share',
  download: 'Download',
  upload: 'Upload',
  camera: 'Camera',
  image: 'Image',
  mic: 'Mic',
  'volume-up': 'Volume2',
  'volume-off': 'VolumeX',
  play: 'Play',
  pause: 'Pause',
  stop: 'Square',
  'skip-forward': 'SkipForward',
  'skip-back': 'SkipBack',
  refresh: 'RefreshCw',
  reload: 'RotateCw',
  flag: 'Flag',
  bookmark: 'Bookmark',
  bell: 'Bell',
  notifications: 'Bell',
  lock: 'Lock',
  unlock: 'Unlock',
  eye: 'Eye',
  'eye-off': 'EyeOff',
  sunny: 'Sun',
  moon: 'Moon',
  cloud: 'Cloud',
  cloudy: 'CloudRain',
  'partly-sunny': 'CloudSun',
  thunderstorm: 'CloudLightning',
  snow: 'CloudSnow',
  help: 'HelpCircle',
  information: 'Info',
  warning: 'AlertTriangle',
  alert: 'AlertCircle',
  checkbox: 'CheckSquare',
  'checkbox-outline': 'Square',
  'radio-button-on': 'Circle',
  'radio-button-off': 'Circle',
  toggle: 'ToggleRight',
}

const createIconComponent = (
  name: string,
  size = 24,
  color = 'currentColor',
  ...props: any
) => {
  const mappedName = iconMap[name] || 'Circle'
  const IconComponent = (LucideIcons as any)[mappedName]

  if (IconComponent) {
    return React.createElement(IconComponent, { size, color, ...props })
  }

  // Fallback
  return React.createElement('div', {
    style: {
      width: size,
      height: size,
      backgroundColor: color,
      borderRadius: '50%',
    },
  })
}

export const Ionicons = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const AntDesign = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const FontAwesome = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const MaterialIcons = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const MaterialCommunityIcons = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const Feather = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const Entypo = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const Foundation = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const Octicons = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const SimpleLineIcons = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const Zocial = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

export const EvilIcons = {
  Button: ({ name, size, color, ...props }: any) =>
    createIconComponent(name, size, color, props),
}

// Default export for when importing directly like:
// import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
export default MaterialCommunityIcons
