/**
 * মামলা নম্বর স্ট্যান্ডার্ড: 1/2026 (বছর সবসময় ৪ সংখ্যা)
 * 1/26 → 1/2026 স্বয়ংক্রিয়ভাবে
 */

export type CaseNumberResult =
  | { ok: true; value: string; corrected: boolean }
  | { ok: false; error: string }

/** ইউনিক ম্যাচ কী — একই মামলা চিহ্নিত করতে */
export function buildCaseMatchKey(parts: {
  caseNumber: string
  division?: string
  district?: string
  courtName?: string
}) {
  const n = normalizeCaseNumber(parts.caseNumber)
  const num = n.ok ? n.value : parts.caseNumber.trim()
  return [
    num.toLowerCase(),
    (parts.division || '').trim(),
    (parts.district || '').trim(),
    (parts.courtName || '').trim(),
  ].join('|')
}

export function normalizeCaseNumber(raw: string): CaseNumberResult {
  const input = String(raw || '').trim().replace(/\s+/g, '')
  if (!input) return { ok: false, error: 'মামলা নম্বর আবশ্যক।' }

  // 1/2026 | 1-2026 | ১/২০২৬ (ascii digits preferred after normalize)
  const ascii = input
    .replace(/[০-৯]/g, (d) => String('০১২৩৪৫৬৭৮৯'.indexOf(d)))
    .replace(/[\/\-–—]/g, '/')

  const m = ascii.match(/^(\d{1,6})\/(\d{2}|\d{4})$/)
  if (!m) {
    return {
      ok: false,
      error: 'সঠিক ফরম্যাট: 1/2026 (নম্বর/৪-অঙ্কের বছর)। 1/26 লিখবেন না।',
    }
  }

  let serial = String(Number(m[1])) // leading zero সরান: 01 → 1
  if (!serial || serial === 'NaN') {
    return { ok: false, error: 'মামলার ক্রমিক নম্বর সঠিক নয়।' }
  }

  let year = m[2]
  let corrected = false
  if (year.length === 2) {
    // 00–99 → 2000–2099 (আইন আদালতের প্রেক্ষাপট)
    year = `20${year}`
    corrected = true
  }

  const yNum = Number(year)
  if (yNum < 1971 || yNum > 2100) {
    return { ok: false, error: 'বছর ১৯৭১–২১০০ এর মধ্যে হতে হবে।' }
  }

  return { ok: true, value: `${serial}/${year}`, corrected }
}

export function caseNumberHint(value: string) {
  const n = normalizeCaseNumber(value)
  if (!value.trim()) return 'উদাহরণ: 1/2026 — বছর সবসময় ৪ সংখ্যা'
  if (!n.ok) return n.error
  if (n.corrected) return `সংশোধিত ফরম্যাট: ${n.value}`
  return `ফরম্যাট ঠিক আছে: ${n.value}`
}
