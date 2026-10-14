import { useEffect, useRef } from 'react'
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type Props = {
  visible: boolean
  title?: string
  message?: string
  /** success = teal check; already = large amber notice */
  variant?: 'success' | 'already'
  onDone?: () => void
}

/** Overlay notice — success or “already entered” */
export function SuccessToast({
  visible,
  title = 'Success',
  message = 'Case saved successfully.',
  variant = 'success',
  onDone,
}: Props) {
  const onDoneRef = useRef(onDone)
  onDoneRef.current = onDone
  const isAlready = variant === 'already'

  useEffect(() => {
    if (!visible) return
    const id = setTimeout(() => onDoneRef.current?.(), isAlready ? 2600 : 2000)
    return () => clearTimeout(id)
  }, [visible, isAlready])

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={styles.backdrop} onPress={onDone}>
        <View style={[styles.card, isAlready ? styles.cardAlready : styles.cardSuccess]}>
          <View style={[styles.iconWrap, isAlready ? styles.iconAlready : null]}>
            <Ionicons
              name={isAlready ? 'information-circle' : 'checkmark-circle'}
              size={isAlready ? 44 : 36}
              color="#ffffff"
            />
          </View>
          <Text style={[styles.title, isAlready ? styles.titleAlready : null]}>{title}</Text>
          {message ? (
            <Text style={[styles.message, isAlready ? styles.messageAlready : null]}>{message}</Text>
          ) : null}
        </View>
      </Pressable>
    </Modal>
  )
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(7, 24, 32, 0.42)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 28,
  },
  card: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 24,
    alignItems: 'center',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
  },
  cardSuccess: {
    backgroundColor: '#146a74',
    shadowColor: '#0a3a42',
  },
  cardAlready: {
    backgroundColor: '#b45309',
    shadowColor: '#7c2d12',
    paddingVertical: 32,
  },
  iconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  iconAlready: {
    width: 76,
    height: 76,
    borderRadius: 38,
  },
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
    textAlign: 'center',
  },
  titleAlready: {
    fontSize: 26,
    lineHeight: 34,
    paddingHorizontal: 4,
  },
  message: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  messageAlready: {
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
})
