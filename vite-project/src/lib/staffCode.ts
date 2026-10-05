/** Generate a short unique staff code like NP-A1B2C3 */
export function generateStaffCode(existing: string[] = []) {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const used = new Set(existing.map((c) => c.toUpperCase()))
  for (let attempt = 0; attempt < 40; attempt++) {
    let body = ''
    for (let i = 0; i < 6; i++) body += chars[Math.floor(Math.random() * chars.length)]
    const code = `NP-${body}`
    if (!used.has(code)) return code
  }
  return `NP-${Date.now().toString(36).toUpperCase().slice(-6)}`
}

export function normalizeStaffQuery(q: string) {
  return q.trim().toLowerCase().replace(/[\s-]/g, '')
}

export function mobileDigits(mobile: string) {
  return mobile.replace(/\D/g, '')
}
