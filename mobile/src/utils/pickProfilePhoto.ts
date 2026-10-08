import * as ImagePicker from 'expo-image-picker'

/** Gallery pick → compressed JPEG data URL for profile photo */
export async function pickProfilePhoto(): Promise<
  { ok: true; dataUrl: string } | { ok: false; cancelled?: boolean; error?: string }
> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync()
  if (!perm.granted) {
    return { ok: false, error: 'গ্যালারি পারমিশন দিন, তারপর আবার চেষ্টা করুন।' }
  }
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    aspect: [1, 1],
    quality: 0.35,
    base64: true,
  })
  if (result.canceled || !result.assets?.[0]) return { ok: false, cancelled: true }
  const base64 = result.assets[0].base64
  if (!base64) return { ok: false, error: 'ছবি পড়া যায়নি।' }
  const dataUrl = `data:image/jpeg;base64,${base64}`
  if (dataUrl.length > 650000) {
    return { ok: false, error: 'ছবি অনেক বড়। আরও ছোট ছবি দিন।' }
  }
  return { ok: true, dataUrl }
}
