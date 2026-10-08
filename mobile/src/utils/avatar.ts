/** React Native Image cannot render Dicebear SVG — prefer PNG. */
export function normalizePhotoUrl(url?: string | null, seed = 'NP'): string {
  const fallback = `https://api.dicebear.com/9.x/initials/png?seed=${encodeURIComponent(seed)}&backgroundColor=0c2e33`
  if (!url || !String(url).trim()) return fallback
  let next = String(url).trim()
  if (next.includes('api.dicebear.com')) {
    next = next.replace('/svg?', '/png?').replace(/\/svg$/, '/png')
  }
  return next
}

export function initialsFromName(name?: string | null): string {
  if (!name?.trim()) return 'NP'
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0] || ''}${parts[parts.length - 1][0] || ''}`.toUpperCase()
}
