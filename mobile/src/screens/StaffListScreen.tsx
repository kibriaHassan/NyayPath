import { useCallback, useState } from 'react'
import { Alert, FlatList, Pressable, RefreshControl, Text, View } from 'react-native'
import { useFocusEffect } from '@react-navigation/native'
import type { NativeStackScreenProps } from '@react-navigation/native-stack'
import { AppButton } from '../components/ui/AppButton'
import { AppCard } from '../components/ui/AppCard'
import { AppInput } from '../components/ui/AppInput'
import { Avatar } from '../components/ui/Avatar'
import { EmptyState, StatusPill } from '../components/ui/MenuRow'
import { Screen } from '../components/ui/Screen'
import { ScreenHeader } from '../components/ui/ScreenHeader'
import { api, ApiError } from '../api/client'
import { useSettingsStore, useT } from '../store/settingsStore'
import type { RootStackParamList } from '../navigation/types'

type Staff = {
  id: string
  name: string
  email: string
  mobile?: string
  staffCode?: string
  role?: string
  active?: boolean
  photo?: string
}

type Props = NativeStackScreenProps<RootStackParamList, 'StaffList'>

export function StaffListScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const [list, setList] = useState<Staff[]>([])
  const [query, setQuery] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [busy, setBusy] = useState(false)

  const load = async () => {
    try {
      const res = await api<{ data: Staff[] }>('/staff')
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

  const addStaff = async () => {
    if (!query.trim()) return
    setBusy(true)
    try {
      await api('/staff/link', {
        method: 'POST',
        body: { query: query.trim(), role: 'Legal Assistant' },
      })
      setQuery('')
      await load()
    } catch (e) {
      Alert.alert(t('error'), e instanceof ApiError ? e.message : t('error'))
    } finally {
      setBusy(false)
    }
  }

  const toggle = async (s: Staff) => {
    try {
      await api(`/staff/${s.id}/access`, {
        method: 'PATCH',
        body: { active: !s.active },
      })
      await load()
    } catch (e) {
      Alert.alert(t('error'), e instanceof ApiError ? e.message : t('error'))
    }
  }

  const remove = async (s: Staff) => {
    Alert.alert(t('delete'), s.name, [
      { text: t('cancel'), style: 'cancel' },
      {
        text: t('delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await api(`/staff/${s.id}`, { method: 'DELETE' })
            await load()
          } catch (e) {
            Alert.alert(t('error'), e instanceof ApiError ? e.message : t('error'))
          }
        },
      },
    ])
  }

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <ScreenHeader title={t('staffTeam')} onBack={() => navigation.goBack()} />
        <View style={{ gap: 8, marginBottom: 8 }}>
          <AppInput label={t('staffIdHint')} value={query} onChangeText={setQuery} />
          <AppButton
            title={busy ? t('loading') : t('addStaff')}
            onPress={addStaff}
            disabled={busy}
            fullWidth
          />
        </View>
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
        ListEmptyComponent={<EmptyState text={t('emptyStaff')} />}
        renderItem={({ item }) => (
          <Pressable onPress={() => navigation.navigate('StaffDetails', { id: item.id, preview: item })}>
            <AppCard>
              <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
                <Avatar uri={item.photo} name={item.name} size={48} />
                <View style={{ flex: 1 }}>
                  <Text style={{ color: c.text, fontWeight: '800' }}>
                    {item.name}{' '}
                    <Text style={{ color: c.primary, fontFamily: 'monospace' }}>{item.staffCode}</Text>
                  </Text>
                  <Text style={{ color: c.textMuted, fontSize: 12, marginTop: 2 }}>
                    {item.role} · {item.email}
                  </Text>
                  <StatusPill
                    label={item.active === false ? t('disabled') : t('active')}
                    tone={item.active === false ? 'danger' : 'success'}
                  />
                </View>
              </View>
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <AppButton
                  title={item.active === false ? t('enable') : t('disable')}
                  variant="outline"
                  onPress={() => void toggle(item)}
                />
                <AppButton title={t('delete')} variant="danger" onPress={() => void remove(item)} />
              </View>
            </AppCard>
          </Pressable>
        )}
      />
    </Screen>
  )
}
