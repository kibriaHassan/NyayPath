export type UserRole = 'LAWYER' | 'STAFF' | 'PUBLIC' | 'ADMIN'

export type CaseStatus =
  | 'Active'
  | 'Pending'
  | 'Hearing Scheduled'
  | 'Disposed'
  | 'Closed'

export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Urgent'
export type TaskStatus = 'Pending' | 'In Progress' | 'Completed'

export type StaffRole = 'Case Manager' | 'Legal Assistant' | 'Office Assistant'

export type DocumentType =
  | 'Case File'
  | 'Petition'
  | 'Order'
  | 'Judgment'
  | 'Evidence'
  | 'Other'

export interface StaffPermissions {
  viewCases: boolean
  editCases: boolean
  addCase: boolean
  viewHearingDates: boolean
  editHearingDates: boolean
  manageDocuments: boolean
  addNotes: boolean
  manageTasks: boolean
}

export interface PublicVisibility {
  enrollmentNumber: boolean
  mobile: boolean
  email: boolean
  chamberAddress: boolean
  bio: boolean
}

export interface Lawyer {
  id: string
  fullName: string
  email: string
  mobile: string
  password?: string
  barAssociation: string
  enrollmentNumber: string
  practiceAreas: string[]
  court: string
  district: string
  chamberName: string
  chamberAddress: string
  bio: string
  photo: string
  yearsOfExperience: number
  designation: string
  publicProfileEnabled: boolean
  visibility: PublicVisibility
  verified: boolean
}

export interface Staff {
  id: string
  lawyerId: string
  name: string
  email: string
  mobile: string
  role: StaffRole
  permissions: StaffPermissions
  active: boolean
  photo: string
}

export interface Case {
  id: string
  caseNumber: string
  caseTitle: string
  caseType: string
  courtName: string
  courtLocation: string
  filingDate: string
  status: CaseStatus
  plaintiff: string
  defendant: string
  plaintiffLawyerId?: string
  defendantLawyerId?: string
  plaintiffLawyerName?: string
  defendantLawyerName?: string
  nextHearingDate: string
  judgeName: string
  description: string
  assignedStaffIds: string[]
  importantNotes: string
  privateNotes: string
  ownerLawyerId: string
}

export interface Hearing {
  id: string
  caseId: string
  caseNumber: string
  caseTitle: string
  hearingDate: string
  hearingTime: string
  court: string
  hearingType: string
  notes: string
  responsibleStaffId?: string
  lawyerId: string
}

export interface CaseDocument {
  id: string
  caseId: string
  name: string
  type: DocumentType
  uploadDate: string
  uploadedBy: string
  fileType: string
  isPublic: boolean
}

export interface Task {
  id: string
  title: string
  description: string
  caseId: string
  caseNumber: string
  assignedStaffId: string
  lawyerId: string
  dueDate: string
  priority: TaskPriority
  status: TaskStatus
}

export interface Notification {
  id: string
  userId: string
  role: UserRole
  title: string
  message: string
  type: 'hearing' | 'case' | 'task' | 'staff' | 'system'
  read: boolean
  createdAt: string
  link?: string
}

export interface AuthUser {
  id: string
  name: string
  email: string
  role: UserRole
  lawyerId?: string
  photo?: string
}
