import { useState } from 'react'
import { Image, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native'
import { useSettingsStore } from '../../store/settingsStore'
import { initialsFromName, normalizePhotoUrl } from '../../utils/avatar'

type Props = {
  uri?: string | null
  name?: string | null
  size?: number
  style?: StyleProp<ViewStyle>
  radius?: number
}

export function Avatar({ uri, name, size = 52, style, radius }: Props) {
  const c = useSettingsStore((s) => s.colors())
  const [failed, setFailed] = useState(false)
  const src = normalizePhotoUrl(uri, name || 'NP')
  const r = radius ?? Math.round(size * 0.32)
  const showImage = Boolean(src) && !failed

  return (
    <View
      style={[
        styles.wrap,
        {
          width: size,
          height: size,
          borderRadius: r,
          backgroundColor: c.primarySoft,
          borderColor: c.border,
        },
        style,
      ]}
    >
      {showImage ? (
        <Image
          source={{ uri: src }}
          style={{ width: size, height: size, borderRadius: r }}
          onError={() => setFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { color: c.primary, fontSize: size * 0.34 }]}>
          {initialsFromName(name)}
        </Text>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  initials: { fontWeight: '800', letterSpacing: 0.5 },
})
