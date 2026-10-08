import { useCallback, useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { EmptyState, StatusPill } from '../components/ui/MenuRow'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { api } from '../api/client'
import { useAuthStore } from '../store/authStore'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

type Task = {
  id: string
  title: string
  description?: string
  caseNumber?: string
  status?: string
  priority?: string
  dueDate?: string
}

type Props = NativeStackScreenProps<RootStackParamList, 'Tasks'>

export function TasksScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const user = useAuthStore((s) => s.user)
  const [list, setList] = useState<Task[]>([])
  const [title, setTitle] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const isLawyer = user?.role === 'LAWYER'

  const load = async () => {
    try {
      const res = await api<{ data: Task[] }>('/tasks')
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

  const create = async () => {
    if (!title.trim()) return
    try {
      await api('/tasks', { method: 'POST', body: { title: title.trim(), priority: 'Medium' } })
      setTitle('')
      await load()
    } catch (e) {
      Alert.alert(t('error'), e instanceof Error ? e.message : t('error'))
    }
  }

  const markDone = async (id: string) => {
    try {
      await api(`/tasks/${id}/status`, { method: 'PATCH', body: { status: 'Completed' } })
      await load()
    } catch {
      /* ignore */
    }
  }

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <ScreenHeader title={t('tasks')} onBack={() => navigation.goBack()} />
        {isLawyer ? (
          <View style={{ gap: 8, marginBottom: 8 }}>
            <AppInput label={t('taskTitle')} value={title} onChangeText={setTitle} />
            <AppButton title={t('createTask')} onPress={create} fullWidth />
          </View>
        ) : null}
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
        ListEmptyComponent={<EmptyState text={t('emptyTasks')} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={{ color: c.text, fontWeight: '800' }}>{item.title}</Text>
            {item.caseNumber ? (
              <Text style={{ color: c.primary, marginTop: 4, fontWeight: '700' }}>{item.caseNumber}</Text>
            ) : null}
            {item.description ? (
              <Text style={{ color: c.textMuted, marginTop: 6 }}>{item.description}</Text>
            ) : null}
            <View style={{ flexDirection: 'row', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <StatusPill label={item.status || 'Pending'} />
              {item.priority ? <StatusPill label={item.priority} tone="warning" /> : null}
            </View>
            {item.status !== 'Completed' ? (
              <Pressable onPress={() => void markDone(item.id)} style={{ marginTop: 10 }}>
                <Text style={{ color: c.success, fontWeight: '800' }}>{t('markDone')}</Text>
              </Pressable>
            ) : null}
          </AppCard>
        )}
      />
    </Screen>
  )
}
