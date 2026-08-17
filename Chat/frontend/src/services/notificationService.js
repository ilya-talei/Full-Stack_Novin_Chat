import api from '@services/api';
import { API_ENDPOINTS } from '@constants/apiEndpoints';
import { config } from '@constants/config';

export const notificationService = {
  async getNotifications() {
    const { data } = await api.get(API_ENDPOINTS.NOTIFICATIONS.LIST);
    const list = data?.notifications ?? data?.data ?? data ?? [];
    const rows = Array.isArray(list) ? list : [];
    return rows.map((n) => ({
      ...n,
      id: String(n.id),
      createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
      meta: n.meta && typeof n.meta === 'object' ? n.meta : {},
    }));
  },

  async markAsRead(id) {
    await api.post(API_ENDPOINTS.NOTIFICATIONS.MARK_READ(id));
  },

  async markAllAsRead() {
    await api.post(API_ENDPOINTS.NOTIFICATIONS.MARK_ALL);
  },

  async deleteNotification(id) {
    await api.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE(id));
  },

  async deleteAllNotifications() {
    await api.delete(API_ENDPOINTS.NOTIFICATIONS.DELETE_ALL);
  },
};

export { contactsService } from '@services/contactsService';

function resolveAvatar(name, avatarFile) {
  if (avatarFile && (String(avatarFile).startsWith('http://') || String(avatarFile).startsWith('https://'))) {
    return avatarFile;
  }
  if (avatarFile && String(avatarFile).startsWith('/')) {
    return `${config.apiBaseUrl || ''}${avatarFile}`;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=6A9BB8&color=fff`;
}

function mapUserProfile(user) {
  const name = user.name || user.display_name || user.username || user.login_id || 'کاربر';
  const avatarFile = user.avatar || user.avatar_file_name || null;

  return {
    id: String(user.id),
    name,
    username: user.username || user.login_id || '',
    phone: user.phone || null,
    email: user.email || null,
    bio: user.bio || '',
    avatar: resolveAvatar(name, avatarFile),
    lastSeenAt: user.last_login_at || user.lastSeenAt || null,
    status: user.status || null,
  };
}

export const profileService = {
  async getProfile() {
    const { data } = await api.get(API_ENDPOINTS.USER.PROFILE);
    const user = data.user ?? data.data ?? data;
    return mapUserProfile(user);
  },

  async getPublicProfile(userId) {
    const { data } = await api.get(API_ENDPOINTS.USER.PUBLIC_PROFILE(userId));
    const user = data.user ?? data.data ?? data;
    return mapUserProfile(user);
  },

  async updateProfile(payload) {
    const { data } = await api.put(API_ENDPOINTS.USER.UPDATE_PROFILE, {
      name: payload.name,
      display_name: payload.name,
      email: payload.email,
      phone: payload.phone,
      bio: payload.bio,
      username: payload.username,
    });
    return { success: true, ...(data.user ?? data.data ?? data) };
  },

  async uploadAvatar(file) {
    const form = new FormData();
    form.append('avatar', file);
    const { data } = await api.put(API_ENDPOINTS.USER.AVATAR, form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    const value = data.avatar || data.avatar_file_name || data;
    return typeof value === 'string' && value.startsWith('/')
      ? `${config.apiBaseUrl || ''}${value}`
      : value;
  },

  async changePassword(currentPassword, newPassword) {
    const { data } = await api.post(API_ENDPOINTS.USER.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
    });
    return data;
  },

  async deleteAccount() {
    const { data } = await api.delete(API_ENDPOINTS.USER.DELETE_ACCOUNT);
    return data;
  },
};
