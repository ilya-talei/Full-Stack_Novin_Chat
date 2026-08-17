import Footer from '@/components/homepageComponents/Footer';
import { Routes, Route, Navigate } from 'react-router-dom';
import HomePage from '@features/home/pages/HomePage';
import NotificationsPage from '@features/notifications/pages/NotificationsPage';
import CallPage from '@features/calls/pages/CallPage';
import ContactsPage from '@features/contacts/pages/ContactsPage';
import AccountPage from '@features/account/pages/AccountPage';
import MyAccountPage from '@features/settings/pages/MyAccountPage';
import ProfileEditPage from '@features/settings/pages/ProfileEditPage';
import ChangePasswordPage from '@features/settings/pages/ChangePasswordPage';
import NotificationsSettingsPage from '@features/settings/pages/NotificationsSettingsPage';
import {
  PrivacySettingsPage,
  PrivacyOptionPage,
} from '@features/settings/pages/PrivacySettingsPage';
import DataStoragePage from '@features/settings/pages/DataStoragePage';
import ChatSettingsPage from '@features/settings/pages/ChatSettingsPage';
import StickersPage from '@features/settings/pages/StickersPage';
import FoldersPage from '@features/settings/pages/FoldersPage';
import DevicesPage from '@features/settings/pages/DevicesPage';
import LanguagePage from '@features/settings/pages/LanguagePage';
import HelpPage from '@features/settings/pages/HelpPage';
import PremiumPage from '@features/settings/pages/PremiumPage';
import BusinessPage from '@features/settings/pages/BusinessPage';
import ManagedChatsPage from '@features/settings/pages/ManagedChatsPage';
import ManageChatPage from '@features/settings/pages/ManageChatPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { ROUTES } from '@constants/routes';

export default function MainLayout() {
  return (
    <div className="relative h-full min-h-0">
      <div className="absolute inset-0 overflow-y-auto pb-28">
        <Routes>
          <Route path="/" element={<Navigate to={ROUTES.HOME} replace />} />
          <Route path={ROUTES.HOME} element={<HomePage />} />
          <Route path={ROUTES.PERSONAL} element={<HomePage />} />
          <Route path={ROUTES.GROUPS} element={<HomePage />} />
          <Route path={ROUTES.CHANNELS} element={<HomePage />} />
          <Route path={ROUTES.NOTIFICATIONS} element={<NotificationsPage />} />
          <Route path={ROUTES.CALL} element={<CallPage />} />
          <Route path={ROUTES.CONTACTS} element={<ContactsPage />} />
          <Route path={ROUTES.ACCOUNT} element={<AccountPage />} />
          <Route path={ROUTES.SETTINGS_ACCOUNT} element={<MyAccountPage />} />
          <Route path={ROUTES.SETTINGS_PROFILE} element={<ProfileEditPage />} />
          <Route path={ROUTES.SETTINGS_PASSWORD} element={<ChangePasswordPage />} />
          <Route path={ROUTES.SETTINGS_NOTIFICATIONS} element={<NotificationsSettingsPage />} />
          <Route path={ROUTES.SETTINGS_PRIVACY} element={<PrivacySettingsPage />} />
          <Route path={`${ROUTES.SETTINGS_PRIVACY}/:key`} element={<PrivacyOptionPage />} />
          <Route path={ROUTES.SETTINGS_DATA} element={<DataStoragePage />} />
          <Route path={ROUTES.SETTINGS_CHAT} element={<ChatSettingsPage />} />
          <Route path={ROUTES.SETTINGS_STICKERS} element={<StickersPage />} />
          <Route path={ROUTES.SETTINGS_FOLDERS} element={<FoldersPage />} />
          <Route path={ROUTES.SETTINGS_DEVICES} element={<DevicesPage />} />
          <Route path={ROUTES.SETTINGS_LANGUAGE} element={<LanguagePage />} />
          <Route path={ROUTES.SETTINGS_HELP} element={<HelpPage />} />
          <Route path={ROUTES.SETTINGS_PREMIUM} element={<PremiumPage />} />
          <Route path={ROUTES.SETTINGS_BUSINESS} element={<BusinessPage />} />
          <Route path={ROUTES.SETTINGS_MANAGED_CHATS} element={<ManagedChatsPage />} />
          <Route path={ROUTES.SETTINGS_MANAGED_CHAT} element={<ManageChatPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </div>

      <div
        id="sidebar-float-layer"
        className="absolute inset-0 z-50 pointer-events-none"
      />

      <div className="app-footer-dock absolute bottom-3 z-40 pointer-events-none">
        <div className="pointer-events-auto">
          <Footer />
        </div>
      </div>
    </div>
  );
}
