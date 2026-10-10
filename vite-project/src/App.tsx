import { Navigate, Route, Routes } from 'react-router-dom'
import {
  AdminLayout,
  LawyerLayout,
  ProtectedRoute,
  PublicLayout,
  StaffLayout,
} from '@/components/layout/AppLayouts'
import LandingPage from '@/pages/public/LandingPage'
import AboutPage from '@/pages/public/AboutPage'
import ContactPage from '@/pages/public/ContactPage'
import CaseSearchPage from '@/pages/public/CaseSearchPage'
import PublicCaseDetailsPage from '@/pages/public/PublicCaseDetailsPage'
import LawyerDirectoryPage from '@/pages/public/LawyerDirectoryPage'
import LawyerPublicProfilePage from '@/pages/public/LawyerPublicProfilePage'
import PrivacyPage from '@/pages/public/PrivacyPage'
import TermsPage from '@/pages/public/TermsPage'
import LoginPage from '@/pages/auth/LoginPage'
import AdminLoginPage from '@/pages/auth/AdminLoginPage'
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
import {
  LawyerUrgentHearingsPage,
  StaffUrgentHearingsPage,
} from '@/pages/shared/UrgentHearingsPage'
import { StaffAccessGuard } from '@/components/layout/StaffLayout'
import AdminDashboardPage from '@/pages/admin/AdminDashboardPage'
import AdminLawyersPage from '@/pages/admin/AdminLawyersPage'
import AdminStaffPage from '@/pages/admin/AdminStaffPage'
import AdminCasesPage from '@/pages/admin/AdminCasesPage'
import AdminCourtsPage from '@/pages/admin/AdminCourtsPage'
import AdminContactsPage from '@/pages/admin/AdminContactsPage'
import AdminSystemPage from '@/pages/admin/AdminSystemPage'
import AdminSettingsPage from '@/pages/admin/AdminSettingsPage'

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
        <Route path="cases/:id" element={<PublicCaseDetailsPage />} />
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
          <Route path="urgent" element={<LawyerUrgentHearingsPage />} />
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
          <Route path="profile" element={<StaffProfilePage />} />
          <Route element={<StaffAccessGuard />}>
            <Route path="dashboard" element={<StaffDashboardPage />} />
            <Route path="urgent" element={<StaffUrgentHearingsPage />} />
            <Route path="cases" element={<StaffCasesPage />} />
            <Route path="cases/new" element={<LawyerCaseFormPage mode="create" />} />
            <Route path="cases/:id" element={<CaseDetailsPage basePath="/staff" />} />
            <Route path="cases/:id/edit" element={<LawyerCaseFormPage mode="edit" />} />
            <Route path="hearings" element={<StaffHearingsPage />} />
            <Route path="tasks" element={<TasksPage forStaff />} />
            <Route path="documents" element={<DocumentsPage forStaff />} />
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="settings" element={<SettingsPage />} />
          </Route>
        </Route>
      </Route>

      {/* /admin → login; /admin/dashboard… → panel */}
      <Route path="admin">
        <Route index element={<AdminLoginPage />} />
        <Route path="login" element={<Navigate to="/admin" replace />} />
        <Route element={<ProtectedRoute roles={['ADMIN']} />}>
          <Route element={<AdminLayout />}>
            <Route path="dashboard" element={<AdminDashboardPage />} />
            <Route path="lawyers" element={<AdminLawyersPage />} />
            <Route path="staff" element={<AdminStaffPage />} />
            <Route path="cases" element={<AdminCasesPage />} />
            <Route path="courts" element={<AdminCourtsPage />} />
            <Route path="contacts" element={<AdminContactsPage />} />
            <Route path="system" element={<AdminSystemPage />} />
            <Route path="settings" element={<AdminSettingsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
