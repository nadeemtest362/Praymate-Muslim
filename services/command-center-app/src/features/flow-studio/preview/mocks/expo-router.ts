// Mock expo-router for web
export const useRouter = () => ({
  push: (path: string) => console.log('Navigate to:', path),
  replace: (path: string) => console.log('Replace to:', path),
  back: () => console.log('Go back'),
  canGoBack: () => false,
})

export const useLocalSearchParams = () => ({})
export const useGlobalSearchParams = () => ({})
export const useSegments = () => []
export const usePathname = () => '/'

export const Link = ({ href, children, ...props }: any) => {
  return children
}

export const Stack = {
  Screen: ({ options, ...props }: any) => null,
}

export const Tabs = {
  Screen: ({ options, ...props }: any) => null,
}

export const router = {
  push: (path: string) => console.log('Navigate to:', path),
  replace: (path: string) => console.log('Replace to:', path),
  back: () => console.log('Go back'),
  canGoBack: () => false,
}
