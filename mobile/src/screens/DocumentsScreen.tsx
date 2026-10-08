import { useCallback, useState } from 'react'
import { Alert, FlatList, RefreshControl, Text, View } from 'react-native'
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

type Doc = {
  id: string
  name: string
  type?: string
  uploadDate?: string
  uploadedBy?: string
  caseId?: string
}

type Props = NativeStackScreenProps<RootStackParamList, 'Documents'>

export function DocumentsScreen({ navigation }: Props) {
  const t = useT()
  const c = useSettingsStore((s) => s.colors())
  const user = useAuthStore((s) => s.user)
  const [list, setList] = useState<Doc[]>([])
  const [name, setName] = useState('')
  const [caseId, setCaseId] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const isLawyer = user?.role === 'LAWYER'

  const load = async () => {
    try {
      const res = await api<{ data: Doc[] }>('/documents')
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

  const upload = async () => {
    if (!name.trim() || !caseId.trim()) {
      Alert.alert(t('error'), 'Case ID ও নাম দিন')
      return
    }
    try {
      await api('/documents', {
        method: 'POST',
        body: { name: name.trim(), caseId: caseId.trim(), type: 'Other', fileType: 'PDF' },
      })
      setName('')
      await load()
    } catch (e) {
      Alert.alert(t('error'), e instanceof Error ? e.message : t('error'))
    }
  }

  return (
    <Screen scroll={false} style={{ paddingHorizontal: 0 }}>
      <View style={{ paddingHorizontal: 20 }}>
        <ScreenHeader title={t('documents')} onBack={() => navigation.goBack()} />
        {isLawyer ? (
          <View style={{ gap: 8, marginBottom: 8 }}>
            <AppInput label="Case ID" value={caseId} onChangeText={setCaseId} />
            <AppInput label={t('docName')} value={name} onChangeText={setName} />
            <AppButton title={t('uploadDoc')} onPress={upload} fullWidth />
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
        ListEmptyComponent={<EmptyState text={t('emptyDocs')} />}
        renderItem={({ item }) => (
          <AppCard>
            <Text style={{ color: c.text, fontWeight: '800' }}>{item.name}</Text>
            <Text style={{ color: c.textMuted, marginTop: 4 }}>
              {item.type || 'Other'} · {item.uploadDate || '—'}
            </Text>
            {item.uploadedBy ? (
              <Text style={{ color: c.textMuted, marginTop: 4, fontSize: 12 }}>{item.uploadedBy}</Text>
            ) : null}
            <StatusPill label={(item as { fileType?: string }).fileType || 'PDF'} />
          </AppCard>
        )}
      />
    </Screen>
  )
}
