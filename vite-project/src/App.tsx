import { Navigate, Route, Routes } from 'react-router-dom'
import {
  LawyerLayout,
  ProtectedRoute,
  PublicLayout,
  StaffLayout,
} from '@/components/layout/AppLayouts'
import LandingPage from '@/pages/public/LandingPage'
import AboutPage from '@/pages/public/AboutPage'
import ContactPage from '@/pages/public/ContactPage'
import CaseSearchPage from '@/pages/public/CaseSearchPage'
import LawyerDirectoryPage from '@/pages/public/LawyerDirectoryPage'
import LawyerPublicProfilePage from '@/pages/public/LawyerPublicProfilePage'
import PrivacyPage from '@/pages/public/PrivacyPage'
import TermsPage from '@/pages/public/TermsPage'
import LoginPage from '@/pages/auth/LoginPage'
import RegisterPage from '@/pages/auth/RegisterPage'
import StaffRegisterPage from '@/pages/auth/StaffRegisterPage'
import ForgotPasswordPage from '@/pages/auth/ForgotPasswordPage'
import LawyerDashboardPage from '@/pages/lawyer/LawyerDashboardPage'
import LawyerCasesPage from '@/pages/lawyer/LawyerCasesPage'
import LawyerCaseFormPage from '@/pages/lawyer/LawyerCaseFormPage'
import CaseDetailsPage from '@/pages/lawyer/CaseDetailsPage'
import LawyerHearingsPage from '@/pages/lawyer/LawyerHearingsPage'
import LawyerStaffPage from '@/pages/lawyer/LawyerStaffPage'
import LawyerStaffDetailsPage from '@/pages/lawyer/LawyerStaffDetailsPage'
import LawyerProfilePage from '@/pages/lawyer/LawyerProfilePage'
import DocumentsPage from '@/pages/shared/DocumentsPage'
import TasksPage from '@/pages/shared/TasksPage'
import NotificationsPage from '@/pages/shared/NotificationsPage'
import SettingsPage from '@/pages/shared/SettingsPage'
import StaffDashboardPage from '@/pages/staff/StaffDashboardPage'
import StaffCasesPage from '@/pages/staff/StaffCasesPage'
import StaffHearingsPage from '@/pages/staff/StaffHearingsPage'
import StaffProfilePage from '@/pages/staff/StaffProfilePage'

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="about" element={<AboutPage />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="privacy" element={<PrivacyPage />} />
        <Route path="terms" element={<TermsPage />} />
        <Route path="cases/search" element={<CaseSearchPage />} />
        <Route path="lawyers" element={<LawyerDirectoryPage />} />
        <Route path="lawyers/:id" element={<LawyerPublicProfilePage />} />
        <Route path="login" element={<LoginPage />} />
        <Route path="register" element={<RegisterPage />} />
        <Route path="register/staff" element={<StaffRegisterPage />} />
        <Route path="forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route element={<ProtectedRoute roles={['LAWYER']} />}>
        <Route path="lawyer" element={<LawyerLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<LawyerDashboardPage />} />
          <Route path="profile" element={<LawyerProfilePage />} />
          <Route path="cases" element={<LawyerCasesPage />} />
          <Route path="cases/new" element={<LawyerCaseFormPage mode="create" />} />
          <Route path="cases/:id" element={<CaseDetailsPage basePath="/lawyer" />} />
          <Route path="cases/:id/edit" element={<LawyerCaseFormPage mode="edit" />} />
          <Route path="hearings" element={<LawyerHearingsPage />} />
          <Route path="staff" element={<LawyerStaffPage />} />
          <Route path="staff/:id" element={<LawyerStaffDetailsPage />} />
          <Route path="documents" element={<DocumentsPage />} />
          <Route path="tasks" element={<TasksPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute roles={['STAFF']} />}>
        <Route path="staff" element={<StaffLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<StaffDashboardPage />} />
          <Route path="cases" element={<StaffCasesPage />} />
          <Route path="cases/:id" element={<CaseDetailsPage basePath="/staff" />} />
          <Route path="hearings" element={<StaffHearingsPage />} />
          <Route path="tasks" element={<TasksPage forStaff />} />
          <Route path="documents" element={<DocumentsPage forStaff />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<StaffProfilePage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
