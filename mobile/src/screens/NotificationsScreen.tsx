import { useCallback, useState } from 'react'
import { FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppCard } from '../components/ui/AppCard'
import { EmptyState, StatusPill } from '../components/ui/MenuRow'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { api } from '../api/client'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

type Notif = {
  id: string
  title: string
  message: string
  type?: string
  read?: boolean
  createdAt?: string
}

type Props = NativeStackScreenProps<RootStackParamList, 'Notifications'>

export function NotificationsScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const [list, setList] = useState<Notif[]>([])
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    try {
      const res = await api<{ data: Notif[] }>('/notifications')
      setList(res.data || [])
    } catch {
      setList([])
    }
  }

  useFocusEffect(
    useCallback(() => {
      void load()
    }, []),
  )

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <ScreenHeader title={t('notifications')} onBack={() => navigation.goBack()} />
      </View>
      <FlatList
        data={list}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true)
              await load()
              setRefreshing(false)
            }}
            tintColor={c.primary}
          />
        }
        contentContainerStyle={{ padding: 20, gap: 10, paddingBottom: 40 }}
        ListEmptyComponent={<EmptyState text={t('emptyNotifs')} />}
        renderItem={({ item }) => (
          <AppCard style={{ opacity: item.read ? 0.7 : 1 }}>
            <Text style={{ color: c.text, fontWeight: '800' }}>{item.title}</Text>
            <Text style={{ color: c.textMuted, marginTop: 6, lineHeight: 20 }}>{item.message}</Text>
            {item.createdAt ? (
              <Text style={{ color: c.textMuted, fontSize: 11, marginTop: 8 }}>
                {new Date(item.createdAt).toLocaleString()}
              </Text>
            ) : null}
            {!item.read ? <StatusPill label="New" /> : null}
          </AppCard>
        )}
      />
    </Screen>
  )
}
