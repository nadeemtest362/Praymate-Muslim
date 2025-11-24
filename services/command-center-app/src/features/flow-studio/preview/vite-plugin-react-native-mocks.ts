import path from 'path'
import type { Plugin } from 'vite'

export function reactNativeMocksPlugin(): Plugin {
  const mockDir = path.resolve(__dirname, './mocks')

  const mockMap: Record<string, string> = {
    'react-native': path.join(mockDir, 'react-native.ts'),
    'react-native-confetti-cannon': path.join(mockDir, 'confetti-cannon.ts'),
    'react-native-reanimated': path.join(mockDir, 'react-native-reanimated.ts'),
    'react-native-safe-area-context': path.join(
      mockDir,
      'react-native-safe-area-context.ts'
    ),
    'react-native-svg': path.join(mockDir, 'react-native-svg.ts'),
    'expo-linear-gradient': path.join(mockDir, 'expo-linear-gradient.ts'),
    'expo-blur': path.join(mockDir, 'expo-blur.ts'),
    'expo-haptics': path.join(mockDir, 'expo-haptics.ts'),
    '@expo/vector-icons': path.join(mockDir, 'expo-vector-icons.ts'),
    '@expo/vector-icons/MaterialCommunityIcons': path.join(
      mockDir,
      'expo-vector-icons.ts'
    ),
    '@expo/vector-icons/Ionicons': path.join(mockDir, 'expo-vector-icons.ts'),
    '@expo/vector-icons/AntDesign': path.join(mockDir, 'expo-vector-icons.ts'),
    '@expo/vector-icons/FontAwesome': path.join(
      mockDir,
      'expo-vector-icons.ts'
    ),
    '@expo/vector-icons/MaterialIcons': path.join(
      mockDir,
      'expo-vector-icons.ts'
    ),
    '@expo/vector-icons/Feather': path.join(mockDir, 'expo-vector-icons.ts'),
    '@expo/vector-icons/Entypo': path.join(mockDir, 'expo-vector-icons.ts'),
    '@expo/vector-icons/Foundation': path.join(mockDir, 'expo-vector-icons.ts'),
    '@expo/vector-icons/Octicons': path.join(mockDir, 'expo-vector-icons.ts'),
    '@expo/vector-icons/SimpleLineIcons': path.join(
      mockDir,
      'expo-vector-icons.ts'
    ),
    '@expo/vector-icons/Zocial': path.join(mockDir, 'expo-vector-icons.ts'),
    '@expo/vector-icons/EvilIcons': path.join(mockDir, 'expo-vector-icons.ts'),
    'expo-router': path.join(mockDir, 'expo-router.ts'),
    'react-native/Libraries/Utilities/codegenNativeComponent': path.join(
      mockDir,
      'codegen.ts'
    ),
  }

  return {
    name: 'vite-plugin-react-native-mocks',
    resolveId(id) {
      if (mockMap[id]) {
        return mockMap[id]
      }
      return null
    },
  }
}
