import { Modal, Pressable, StyleSheet, Text, View } from 'react-native'
import { Ionicons } from '@expo/vector-icons'

type Props = {
  visible: boolean
  title?: string
  message?: string
  onDone?: () => void
}

/** Blue success overlay — English copy, no system Alert chrome */
export function SuccessToast({
  visible,
  title = 'Success',
  message = 'Case saved successfully.',
  onDone,
}: Props) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onDone}>
      <Pressable style={styles.backdrop} onPress={onDone}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="checkmark-circle" size={36} color="#ffffff" />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{message}</Text>
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
    maxWidth: 320,
    borderRadius: 22,
    paddingVertical: 28,
    paddingHorizontal: 24,
    backgroundColor: '#146a74',
    alignItems: 'center',
    shadowColor: '#0a3a42',
    shadowOpacity: 0.35,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    elevation: 8,
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
  title: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  message: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
})
