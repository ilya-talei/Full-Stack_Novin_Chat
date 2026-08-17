import api from '@services/api';
import { API_ENDPOINTS } from '@constants/apiEndpoints';

function unwrap(data, keys = []) {
  for (const key of keys) {
    if (data?.[key] != null) return data[key];
    if (data?.data?.[key] != null) return data.data[key];
  }
  return data?.data ?? data;
}

function avatarUrl(entity, fallback = 'گروه') {
  const value = entity?.avatar || entity?.avatar_url || entity?.avatar_file_name;
  if (value && /^https?:\/\//i.test(String(value))) return value;
  const name = entity?.name || entity?.chat_name || fallback;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=3390EC&color=fff&size=160`;
}

function normalizePermissions(value = {}) {
  return value && typeof value === 'object' ? value : {};
}

export function mapManagedChat(chat = {}) {
  const settings = chat.settings || chat.chat_settings || {};
  const name = chat.name || chat.chat_name || 'بدون نام';
  return {
    ...chat,
    id: String(chat.id),
    name,
    type: chat.type || chat.chat_type || 'group',
    description: chat.description || '',
    avatar: avatarUrl(chat),
    isPublic: Boolean(chat.is_public ?? chat.public ?? chat.username),
    username: chat.username || chat.public_username || '',
    historyVisible: Boolean(chat.history_visible ?? settings.history_visible ?? true),
    signaturesEnabled: Boolean(
      chat.signatures_enabled ?? chat.admin_signatures ?? settings.signatures_enabled
    ),
    slowModeSeconds: Number(chat.slow_mode_seconds ?? settings.slow_mode_seconds ?? 0),
    defaultPermissions: normalizePermissions(
      chat.default_permissions || settings.default_permissions
    ),
    memberCount: Number(chat.member_count ?? chat.members_count ?? chat.memberCount ?? 0),
  };
}

function mapMember(member = {}) {
  const user = member.user || member;
  const name = user.name || user.display_name || user.username || user.login_id || 'کاربر';
  const role = member.role || (member.is_admin ? 'admin' : 'member');
  return {
    ...member,
    id: String(user.id ?? member.user_id),
    name,
    username: user.username || user.login_id || '',
    avatar: avatarUrl({ ...user, avatar_file_name: user.userAvatar?.[0]?.avatar_file_name }, name),
    role,
    customTitle: member.custom_title || '',
    restricted: role === 'restricted' || Boolean(member.restricted || member.is_restricted),
    adminPermissions: normalizePermissions(
      member.admin_permissions || member.permissions
    ),
  };
}

export const chatManagementService = {
  async getManageableChats() {
    const { data } = await api.get(API_ENDPOINTS.CHAT.MANAGE);
    const rows = unwrap(data, ['chats', 'manageable_chats']);
    return (Array.isArray(rows) ? rows : []).map(mapManagedChat);
  },

  async getChat(chatId) {
    const { data } = await api.get(API_ENDPOINTS.CHAT.MANAGE_DETAIL(chatId));
    return mapManagedChat(unwrap(data, ['chat']));
  },

  async updateChat(chatId, payload) {
    const body = {
      chat_name: payload.name,
      description: payload.description,
      is_public: payload.isPublic,
      public_username: payload.isPublic ? String(payload.username || '').toLowerCase() : null,
      history_visible: payload.historyVisible,
      signatures_enabled: payload.signaturesEnabled,
      slow_mode_seconds: payload.slowModeSeconds,
      default_permissions: payload.defaultPermissions,
    };
    const { data } = await api.put(API_ENDPOINTS.CHAT.SETTINGS(chatId), body);
    return mapManagedChat(unwrap(data, ['chat']));
  },

  async uploadAvatar(chatId, file) {
    const form = new FormData();
    form.append('avatar', file);
    const { data } = await api.put(API_ENDPOINTS.CHAT.AVATAR(chatId), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap(data, ['avatar', 'avatar_url', 'avatar_file_name']);
  },

  async getMembers(chatId) {
    const { data } = await api.get(API_ENDPOINTS.CHAT.MEMBERS(chatId));
    const rows = unwrap(data, ['members']);
    return (Array.isArray(rows) ? rows : []).map(mapMember);
  },

  async addMember(chatId, userId) {
    const { data } = await api.post(API_ENDPOINTS.CHAT.MEMBERS(chatId), {
      user_id: Number(userId),
    });
    const rows = unwrap(data, ['members']);
    const list = (Array.isArray(rows) ? rows : [rows]).map(mapMember);
    return list.find((member) => member.id === String(userId)) || list.at(-1);
  },

  async removeMember(chatId, userId) {
    await api.delete(API_ENDPOINTS.CHAT.MEMBER(chatId, userId));
  },

  async setRestriction(chatId, userId, restricted) {
    const { data } = await api.put(API_ENDPOINTS.CHAT.MEMBER(chatId, userId), {
      role: restricted ? 'restricted' : 'member',
      member_permissions: restricted
        ? {
            send_messages: false,
            send_photos: false,
            send_videos: false,
            send_files: false,
            send_voice: false,
            send_video_messages: false,
            send_stickers: false,
            send_gifs: false,
            send_links: false,
            send_polls: false,
            add_members: false,
            change_info: false,
            pin_messages: false,
          }
        : null,
      admin_permissions: null,
      custom_title: null,
    });
    return mapMember(unwrap(data, ['member']));
  },

  async updateAdmin(chatId, userId, payload) {
    const { data } = await api.put(API_ENDPOINTS.CHAT.MEMBER(chatId, userId), {
      role: 'admin',
      custom_title: payload.customTitle || '',
      admin_permissions: payload.adminPermissions,
      member_permissions: null,
    });
    return mapMember(unwrap(data, ['member', 'admin']));
  },

  async removeAdmin(chatId, userId) {
    const { data } = await api.put(API_ENDPOINTS.CHAT.MEMBER(chatId, userId), {
      role: 'member',
      custom_title: null,
      admin_permissions: null,
    });
    return mapMember(unwrap(data, ['member']));
  },
};
