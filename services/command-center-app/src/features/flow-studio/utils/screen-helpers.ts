export function findScreenById(screenId: string, screenTemplates: any[]) {
  return screenTemplates.find((s) => s.id === screenId || s.type === screenId)
}

export function findScreensByCategory(
  category: string,
  screenTemplates: any[]
) {
  return screenTemplates.filter((s) => s.category === category)
}

export function getScreenColor(screenType: string, screenTemplates: any[]) {
  const screen = findScreenById(screenType, screenTemplates)
  return screen?.color || 'from-gray-500 to-gray-600'
}
