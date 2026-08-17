import { io } from 'socket.io-client';
import { config } from '@constants/config';

let socket = null;

function createUuid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

function waitUntilConnected(current, timeoutMs = 8000) {
  if (current.connected) return Promise.resolve(current);
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error('اتصال به سرور برقرار نشد'));
    }, timeoutMs);

    const onConnect = () => {
      cleanup();
      resolve(current);
    };
    const onError = () => {
      cleanup();
      reject(new Error('خطا در اتصال به سرور'));
    };

    const cleanup = () => {
      clearTimeout(timer);
      current.off('connect', onConnect);
      current.off('connect_error', onError);
    };

    current.once('connect', onConnect);
    current.once('connect_error', onError);
  });
}

export const socketService = {
  connect() {
    if (config.useMockAuth) return null;
    if (socket?.connected) return socket;

    if (!socket) {
      const token =
        localStorage.getItem(config.tokenKey) ||
        sessionStorage.getItem(config.tokenKey) ||
        '';
      const auth = token && token !== 'cookie' ? { token } : undefined;
      socket = io(config.wsUrl || undefined, {
        withCredentials: true,
        auth,
        transports: ['websocket', 'polling'],
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 8,
        reconnectionDelay: 800,
      });
    } else if (!socket.connected) {
      socket.connect();
    }

    return socket;
  },

  disconnect() {
    if (socket) {
      socket.disconnect();
      socket = null;
    }
  },

  getSocket() {
    return socket;
  },

  joinChat(chatId) {
    const current = this.connect();
    if (!current) return;
    const emitJoin = () => current.emit('join_chat', { chat_id: Number(chatId) });
    if (current.connected) emitJoin();
    else current.once('connect', emitJoin);
  },

  emitTyping(chatId, isTyping, activity = 'typing') {
    const current = this.connect();
    if (!current?.connected) return;
    current.emit(isTyping ? 'typing' : 'stop_typing', {
      chat_id: Number(chatId),
      ...(isTyping ? { activity } : {}),
    });
  },

  markRead(chatId, messageId) {
    const current = this.connect();
    if (!current) return;
    const payload = {
      chat_id: Number(chatId),
      ...(messageId != null ? { message_id: Number(messageId) } : {}),
    };
    const emit = () => current.emit('mark_read', payload);
    if (current.connected) emit();
    else current.once('connect', emit);
  },

  sendCallEvent(eventName, payload) {
    const current = this.connect();
    if (!current) return false;
    const emit = () => current.emit(eventName, payload);
    if (current.connected) emit();
    else current.once('connect', emit);
    return true;
  },

  async sendTextMessage(chatId, text) {
    const current = this.connect();
    if (!current) {
      return Promise.reject(new Error('اتصال سوکت فعال نیست'));
    }

    await waitUntilConnected(current);

    const trimmed = String(text || '').trim();
    if (!trimmed) {
      return Promise.reject(new Error('پیام خالی است'));
    }
    if (trimmed.length > 4096) {
      return Promise.reject(new Error('پیام بیش از حد طولانی است'));
    }

    const now = new Date();
    const messageUuid = createUuid();
    const payload = {
      chat_id: Number(chatId),
      message_type: 'text',
      message_uuid: messageUuid,
      message_data: {
        type: 'text',
        content: trimmed,
        created_at: now,
        sender_id: 0,
        chat_id: Number(chatId),
      },
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('ارسال پیام زمان‌بر شد. دوباره تلاش کنید'));
      }, 15000);

      const onResponse = (data) => {
        if (data?.message_uuid && data.message_uuid !== messageUuid) return;
        cleanup();
        resolve(data);
      };

      const onError = (message) => {
        cleanup();
        reject(new Error(typeof message === 'string' ? message : 'خطا در ارسال پیام'));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        current.off('message_response', onResponse);
        current.off('error', onError);
      };

      current.on('message_response', onResponse);
      current.once('error', onError);
      current.emit('message', payload);
    });
  },

  deleteMessage(chatId, messageId) {
    const current = this.connect();
    if (!current?.connected) {
      return Promise.reject(new Error('اتصال سوکت فعال نیست'));
    }

    current.emit('delete_message', {
      chat_id: Number(chatId),
      message_id: Number(messageId),
    });
    return Promise.resolve();
  },

  async editMessage(chatId, messageId, content) {
    const current = this.connect();
    if (!current) {
      return Promise.reject(new Error('اتصال سوکت فعال نیست'));
    }

    await waitUntilConnected(current);

    const trimmed = String(content || '').trim();
    if (!trimmed) {
      return Promise.reject(new Error('پیام خالی است'));
    }
    if (trimmed.length > 4096) {
      return Promise.reject(new Error('پیام بیش از حد طولانی است'));
    }

    const payload = {
      chat_id: Number(chatId),
      message_id: Number(messageId),
      content: trimmed,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        cleanup();
        reject(new Error('ویرایش پیام زمان‌بر شد'));
      }, 15000);

      const onResponse = (data) => {
        if (String(data?.id) !== String(messageId)) return;
        cleanup();
        resolve(data);
      };

      const onError = (message) => {
        cleanup();
        reject(new Error(typeof message === 'string' ? message : 'خطا در ویرایش پیام'));
      };

      const cleanup = () => {
        clearTimeout(timeout);
        current.off('edit_message_response', onResponse);
        current.off('error', onError);
      };

      current.on('edit_message_response', onResponse);
      current.once('error', onError);
      current.emit('edit_message', payload);
    });
  },
};
