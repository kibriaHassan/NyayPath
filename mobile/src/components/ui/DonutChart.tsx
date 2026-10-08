import { StyleSheet, Text, View } from 'react-native'
import Svg, { Circle, G } from 'react-native-svg'

export type DonutSlice = { label: string; value: number; color: string }

type Props = {
  slices: DonutSlice[]
  size?: number
  stroke?: number
  track?: string
  centerLabel: string
  centerSub?: string
  labelColor?: string
  subColor?: string
}

export function DonutChart({
  slices,
  size = 132,
  stroke = 16,
  track = '#E6EDF5',
  centerLabel,
  centerSub,
  labelColor = '#1e293b',
  subColor = '#64748b',
}: Props) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0)
  const radius = (size - stroke) / 2
  const circ = 2 * Math.PI * radius
  const cx = size / 2
  let drawn = 0
  const parts = total > 0 ? slices.filter((slice) => slice.value > 0) : []

  return (
    <View style={{ width: size, height: size }}>
      <Svg width={size} height={size}>
        <G rotation={-90} origin={`${cx}, ${cx}`}>
          <Circle cx={cx} cy={cx} r={radius} stroke={track} strokeWidth={stroke} fill="none" />
          {parts.map((slice) => {
            const len = (slice.value / total) * circ
            const node = (
              <Circle
                key={slice.label}
                cx={cx}
                cy={cx}
                r={radius}
                stroke={slice.color}
                strokeWidth={stroke}
                fill="none"
                strokeDasharray={`${len} ${circ - len}`}
                strokeDashoffset={-drawn}
              />
            )
            drawn += len
            return node
          })}
        </G>
      </Svg>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <View style={styles.center}>
          <Text style={[styles.centerLabel, { color: labelColor }]}>{centerLabel}</Text>
          {centerSub ? <Text style={[styles.centerSub, { color: subColor }]}>{centerSub}</Text> : null}
        </View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  centerLabel: { fontSize: 22, fontWeight: '800' },
  centerSub: { fontSize: 11, fontWeight: '700', marginTop: 1 },
})
