import type { NavigatorScreenParams } from '@react-navigation/native'

export type PublicTabParamList = {
  Home: undefined
  CaseSearch: undefined
  Lawyers: undefined
  Settings: undefined
}

export type RootStackParamList = {
  Welcome: undefined
  Login: undefined
  Register: undefined
  PublicTabs: NavigatorScreenParams<PublicTabParamList> | undefined
  LawyerTabs: NavigatorScreenParams<LawyerTabParamList> | undefined
  StaffTabs: NavigatorScreenParams<StaffTabParamList> | undefined
  CaseDetails: {
    id: string
    preview?: Record<string, unknown>
  }
  CaseForm: {
    mode: 'create' | 'edit'
    id?: string
    preview?: Record<string, unknown>
  }
  LawyerProfile: {
    id: string
    preview?: {
      id: string
      fullName: string
      district?: string
      court?: string
      practiceType?: string
      yearsOfExperience?: number
      photo?: string
      verified?: boolean
      chamberName?: string
    }
  }
  LawyerOwnProfile: undefined
  Notifications: undefined
  Tasks: undefined
  Documents: undefined
  StaffList: undefined
  StaffDetails: { id: string; preview?: Record<string, unknown> }
  StaffProfile: undefined
  Settings: undefined
}

export type LawyerTabParamList = {
  Dashboard: undefined
  Cases: { unassigned?: boolean } | undefined
  CaseCalendar: undefined
  DayCases: { filter?: 'today' | 'next' | 'pending' } | undefined
}

export type StaffTabParamList = {
  Dashboard: undefined
  Cases: { unassigned?: boolean } | undefined
  CaseCalendar: undefined
  DayCases: { filter?: 'today' | 'next' | 'pending' } | undefined
  Profile: undefined
}
