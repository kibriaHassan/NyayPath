export type ThemeMode = 'light' | 'dark'

export type AppColors = {
  bg: string
  bgElevated: string
  card: string
  text: string
  textMuted: string
  border: string
  primary: string
  primarySoft: string
  accent: string
  danger: string
  success: string
  warning: string
  ink: string
  sand: string
  overlay: string
  tabBar: string
  inputBg: string
  gold: string
}

export const lightColors: AppColors = {
  bg: '#e9eef1',
  bgElevated: '#fbfcfd',
  card: '#ffffff',
  text: '#0a1a22',
  textMuted: '#5a6d78',
  border: '#d2dde4',
  primary: '#146a74',
  primarySoft: 'rgba(20,106,116,0.11)',
  accent: '#b87333',
  danger: '#c23b3b',
  success: '#1f8a5b',
  warning: '#c9921a',
  ink: '#071820',
  sand: '#f4efe6',
  overlay: 'rgba(7,24,32,0.48)',
  tabBar: '#ffffff',
  inputBg: '#f7fafb',
  gold: '#c9a227',
}

export const darkColors: AppColors = {
  bg: '#060e14',
  bgElevated: '#0d1820',
  card: '#121f29',
  text: '#eef3f6',
  textMuted: '#8fa3b0',
  border: '#243645',
  primary: '#3ec4d1',
  primarySoft: 'rgba(62,196,209,0.14)',
  accent: '#e0a06a',
  danger: '#ef6b6b',
  success: '#3dcb8a',
  warning: '#e0b040',
  ink: '#eef3f6',
  sand: '#1a2632',
  overlay: 'rgba(0,0,0,0.55)',
  tabBar: '#0d1820',
  inputBg: '#0a141c',
  gold: '#d4b84a',
}
