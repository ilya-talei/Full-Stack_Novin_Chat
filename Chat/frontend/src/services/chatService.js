import api from '@services/api';
import { API_ENDPOINTS } from '@constants/apiEndpoints';
import { socketService } from '@services/socketService';
import { formatRelativeDate } from '@utils/formatDate';
import { getMessagePreview } from '@features/chat/utils/messageMeta';

function avatarUrl(name, fileName) {
  if (fileName && (fileName.startsWith('http://') || fileName.startsWith('https://'))) {
    return fileName;
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name || 'U')}&background=6A9BB8&color=fff&size=128`;
}

function mapChatType(type) {
  if (type === 'private') return 'personal';
  if (type === 'group') return 'groups';
  if (type === 'channel') return 'channels';
  return type;
}

function lastMessageText(lastMessage) {
  if (!lastMessage) return '';
  const data = lastMessage.message_data;
  const raw = typeof data === 'string' ? data : data?.content ?? '';
  return getMessagePreview(raw, 80);
}

function mapConversation(chat) {
  const name =
    chat.type === 'private'
      ? chat.name || chat.login_id
      : chat.name || chat.chat_name || `?? ${chat.id}`;

  return {
    id: String(chat.id),
    name,
    username: chat.login_id || undefined,
    lastMessage: lastMessageText(chat.lastMessage),
    date: chat.lastMessage?.created_at
      ? formatRelativeDate(chat.lastMessage.created_at)
      : '?',
    unread: chat.unread ?? 0,
    online: Boolean(chat.online),
    type: mapChatType(chat.type),
    avatar: avatarUrl(name, chat.avatar_file_name),
    description: chat.description || '',
    memberCount: chat.memberCount,
    subscriberCount: chat.subscriberCount,
    role: chat.role || (chat.type === 'private' ? 'member' : 'member'),
    permissions: chat.permissions && typeof chat.permissions === 'object' ? chat.permissions : {},
    canManage: Boolean(chat.canManage),
    peerUserId: chat.peer_user_id ? String(chat.peer_user_id) : undefined,
    lastSeenAt:
      chat.last_seen_at ||
      chat.lastSeenAt ||
      chat.last_login_at ||
      chat.peer_last_login_at ||
      null,
    raw: chat,
  };
}

function mapMessage(message, currentUserId) {
  const data =
    typeof message.message_data === 'string'
      ? { content: message.message_data }
      : message.message_data || {};
  const content = data?.content ?? '';

  const senderId = message.sender?.id ?? message.sender_id;
  const isMine =
    currentUserId != null && String(senderId) === String(currentUserId);

  const edited =
    Boolean(data?.edited) ||
    (message.updated_at &&
      message.created_at &&
      new Date(message.updated_at).getTime() - new Date(message.created_at).getTime() > 2000);

  return {
    id: String(message.id),
    text: content,
    senderId: isMine ? 'me' : String(senderId ?? 'other'),
    createdAt: message.created_at ? new Date(message.created_at) : new Date(),
    edited: Boolean(edited),
    editedAt: data?.edited_at
      ? new Date(data.edited_at)
      : message.updated_at
        ? new Date(message.updated_at)
        : null,
    read: isMine ? Boolean(message.read) : true,
    pending: Boolean(message.pending),
    failed: Boolean(message.failed),
    raw: message,
  };
}

function mapSocketMessage(data, currentUserId) {
  return mapMessage(
    {
      id: data.id,
      message_data: data.message_data,
      sender: data.sender,
      sender_id: data.sender?.id,
      created_at: data.created_at,
      updated_at: data.updated_at,
    },
    currentUserId
  );
}

function getCurrentUserId() {
  try {
    const raw =
      localStorage.getItem('novin_chat_user') ||
      sessionStorage.getItem('novin_chat_user');
    if (!raw) return null;
    return JSON.parse(raw)?.id ?? null;
  } catch {
    return null;
  }
}

export const chatService = {
  mapSocketMessage,
  mapConversation,

  async getConversations() {
    const { data } = await api.get(API_ENDPOINTS.CHAT.CONVERSATIONS);
    const list = data.data ?? data.conversations ?? data;
    return (Array.isArray(list) ? list : []).map(mapConversation);
  },

  async getMessages(conversationId) {
    const { data } = await api.get(API_ENDPOINTS.CHAT.MESSAGES, {
      params: { chat_id: Number(conversationId), limit: 50 },
    });
    const list = data.messages ?? data.messasges ?? data;
    const currentUserId = getCurrentUserId();
    const mapped = (Array.isArray(list) ? list : []).map((m) =>
      mapMessage(m, currentUserId)
    );
    return mapped.reverse();
  },

  async sendMessage(conversationId, text) {
    const data = await socketService.sendTextMessage(conversationId, text);
    return mapSocketMessage(data, getCurrentUserId());
  },

  async markAsRead(conversationId, messageId) {
    const sock = socketService.getSocket?.() || socketService.connect?.();
    if (sock?.connected) {
      socketService.markRead(conversationId, messageId);
      return;
    }
    await api.post(API_ENDPOINTS.CHAT.MARK_READ(conversationId), {
      ...(messageId != null ? { message_id: Number(messageId) } : {}),
    });
  },

  async deleteMessage(conversationId, messageId) {
    socketService.deleteMessage(conversationId, messageId);
  },

  async editMessage(conversationId, messageId, text) {
    const data = await socketService.editMessage(conversationId, messageId, text);
    return mapSocketMessage(data, getCurrentUserId());
  },

  async createGroup(payload) {
    const { data } = await api.post(API_ENDPOINTS.CHAT.CREATE, {
      type: 'group',
      chat_name: payload.name,
      description: payload.description ?? '',
      member_ids: (payload.memberIds || []).map(Number),
      memberIds: (payload.memberIds || []).map(Number),
    });
    const conversation = mapConversation({
      ...data.data,
      type: 'group',
      name: data.data?.name ?? payload.name,
      description: payload.description,
    });
    socketService.joinChat(conversation.id);
    return conversation;
  },

  async createChannel(payload) {
    const { data } = await api.post(API_ENDPOINTS.CHAT.CREATE, {
      type: 'channel',
      chat_name: payload.name,
      description: payload.description ?? '',
    });
    const conversation = mapConversation({
      ...data.data,
      type: 'channel',
      name: data.data?.name ?? payload.name,
      description: payload.description,
    });
    socketService.joinChat(conversation.id);
    return conversation;
  },

  async startChatWithContact(contact) {
    const { data } = await api.post(API_ENDPOINTS.CHAT.START_CHAT, {
      contactId: Number(contact.id),
      contact_id: Number(contact.id),
    });
    const conversation = mapConversation(data.data ?? data);
    socketService.joinChat(conversation.id);
    return conversation;
  },

  /**
   * Upload chat media (photo/video/file/voice/videonote).
   * @returns {{ path: string, fileName: string, mimeType: string, size: number, originalName: string, kind: string, storage: string }}
   */
  async uploadMedia(chatId, file, kind = 'file') {
    const form = new FormData();
    form.append('file', file);
    form.append('kind', kind);
    const { data } = await api.post(API_ENDPOINTS.CHAT.UPLOAD_MEDIA(chatId), form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000,
    });
    return data;
  },
};
