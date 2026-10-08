import { useMemo } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { darkColors, lightColors, type AppColors, type ThemeMode } from '../theme/colors'
import { dictionaries, type DictKey, type Lang } from '../i18n/dictionaries'

type SettingsState = {
  theme: ThemeMode
  lang: Lang
  hydrated: boolean
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setLang: (lang: Lang) => void
  toggleLang: () => void
  setHydrated: (v: boolean) => void
  colors: () => AppColors
  t: (key: DictKey) => string
}

/** Re-renders when language changes. `s.t` itself does not. */
export function useT() {
  const lang = useSettingsStore((s) => s.lang)
  return useMemo(() => (key: DictKey) => dictionaries[lang][key], [lang])
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set, get) => ({
      theme: 'light',
      lang: 'bn',
      hydrated: false,
      setTheme: (theme) => set({ theme }),
      toggleTheme: () => set({ theme: get().theme === 'light' ? 'dark' : 'light' }),
      setLang: (lang) => set({ lang }),
      toggleLang: () => set({ lang: get().lang === 'bn' ? 'en' : 'bn' }),
      setHydrated: (hydrated) => set({ hydrated }),
      colors: () => (get().theme === 'dark' ? darkColors : lightColors),
      t: (key) => dictionaries[get().lang][key],
    }),
    {
      name: 'nyaypath-mobile-settings',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ theme: s.theme, lang: s.lang }),
      onRehydrateStorage: () => (state) => {
        state?.setHydrated(true)
      },
    },
  ),
)
