import { createContext, useContext, useReducer, useCallback, useEffect, useRef } from 'react';
import { chatService } from '@services/chatService';
import { socketService } from '@services/socketService';
import { CHAT_ACTIONS } from '@constants/actionTypes';
import { config } from '@constants/config';
import { useAuth } from '@context/AuthContext';
import { useSettings } from '@context/SettingsContext';
import { useToast } from '@components/ui/Toast';
import {
  playInAppNotificationFeedback,
  shouldNotifyForChatType,
} from '@utils/settingsRuntime';
import { getMessagePreview } from '@features/chat/utils/messageMeta';

const ChatContext = createContext(null);

const initialState = {
  conversations: [],
  activeChat: null,
  messages: [],
  typingUsers: {},
  onlineUsers: {},
  loading: false,
  messagesLoading: false,
  error: null,
};

function chatReducer(state, action) {
  switch (action.type) {
    case CHAT_ACTIONS.SET_CONVERSATIONS: {
      const onlineUsers = { ...state.onlineUsers };
      const conversations = (action.payload || []).map((c) => {
        if (c.peerUserId == null) return c;
        const peerKey = String(c.peerUserId);
        if (typeof c.online === 'boolean') {
          onlineUsers[peerKey] = c.online;
          return { ...c, peerUserId: peerKey };
        }
        if (onlineUsers[peerKey] != null) {
          return { ...c, peerUserId: peerKey, online: Boolean(onlineUsers[peerKey]) };
        }
        return { ...c, peerUserId: peerKey };
      });

      let activeChat = state.activeChat;
      if (activeChat?.peerUserId != null) {
        const peerKey = String(activeChat.peerUserId);
        const match = conversations.find((c) => String(c.id) === String(activeChat.id));
        const online = onlineUsers[peerKey];
        activeChat = {
          ...(match || activeChat),
          peerUserId: peerKey,
          online: online != null ? Boolean(online) : Boolean((match || activeChat).online),
          lastSeenAt: match?.lastSeenAt || activeChat.lastSeenAt,
        };
      }

      return { ...state, conversations, onlineUsers, activeChat, loading: false };
    }
    case CHAT_ACTIONS.SET_ACTIVE_CHAT: {
      const chat = action.payload;
      if (!chat) return { ...state, activeChat: null };
      const peerKey = chat.peerUserId != null ? String(chat.peerUserId) : null;
      const online =
        peerKey != null && state.onlineUsers[peerKey] != null
          ? Boolean(state.onlineUsers[peerKey])
          : Boolean(chat.online);
      return {
        ...state,
        activeChat: { ...chat, peerUserId: peerKey ?? chat.peerUserId, online },
      };
    }
    case CHAT_ACTIONS.ADD_CONVERSATION:
      return {
        ...state,
        conversations: [
          action.payload,
          ...state.conversations.filter((c) => c.id !== action.payload.id),
        ],
      };
    case CHAT_ACTIONS.SET_MESSAGES:
      return { ...state, messages: action.payload, messagesLoading: false };
    case 'CLEAR_MESSAGES':
      return { ...state, messages: [] };
    case CHAT_ACTIONS.ADD_MESSAGE: {
      if (state.messages.some((m) => String(m.id) === String(action.payload.id))) {
        return state;
      }
      return { ...state, messages: [...state.messages, action.payload] };
    }
    case 'REMOVE_MESSAGE':
      return {
        ...state,
        messages: state.messages.filter((m) => String(m.id) !== String(action.payload)),
      };
    case 'UPDATE_MESSAGE': {
      const next = action.payload;
      return {
        ...state,
        messages: state.messages.map((m) =>
          String(m.id) === String(next.id) ? { ...m, ...next } : m
        ),
      };
    }
    case CHAT_ACTIONS.SET_TYPING:
      return {
        ...state,
        typingUsers: {
          ...state.typingUsers,
          [action.payload.chatId]: action.payload.isTyping,
        },
      };
    case 'SET_ONLINE': {
      const userId = String(action.payload.userId);
      const online = Boolean(action.payload.online);
      const lastSeenAt = action.payload.lastSeenAt || (!online ? new Date().toISOString() : null);

      const patchPeer = (c) => {
        if (!c?.peerUserId || String(c.peerUserId) !== userId) return c;
        return {
          ...c,
          online,
          ...(lastSeenAt ? { lastSeenAt } : {}),
        };
      };

      return {
        ...state,
        onlineUsers: {
          ...state.onlineUsers,
          [userId]: online,
        },
        conversations: state.conversations.map(patchPeer),
        activeChat: patchPeer(state.activeChat),
      };
    }
    case CHAT_ACTIONS.MARK_READ:
      return {
        ...state,
        conversations: state.conversations.map((c) =>
          c.id === action.payload ? { ...c, unread: 0 } : c
        ),
      };
    case 'MARK_MESSAGES_READ': {
      const { chatId, lastReadMessageId, readerId } = action.payload;
      if (
        !state.activeChat ||
        String(state.activeChat.id) !== String(chatId)
      ) {
        return state;
      }
      // Ignore our own read cursor; we only care when the peer saw our messages.
      if (readerId != null && String(readerId) === String(action.payload.currentUserId)) {
        return state;
      }
      const lastId = Number(lastReadMessageId);
      if (!Number.isFinite(lastId)) return state;
      let changed = false;
      const messages = state.messages.map((m) => {
        if (m.senderId !== 'me' || m.read) return m;
        if (Number(m.id) <= lastId) {
          changed = true;
          return { ...m, read: true };
        }
        return m;
      });
      return changed ? { ...state, messages } : state;
    }
    case CHAT_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };
    case 'SET_MESSAGES_LOADING':
      return { ...state, messagesLoading: action.payload };
    default:
      return state;
  }
}

export function ChatProvider({ children }) {
  const [state, dispatch] = useReducer(chatReducer, initialState);
  const { isAuthenticated, user } = useAuth();
  const { settings } = useSettings();
  const { addToast } = useToast();
  const activeChatRef = useRef(null);
  const conversationsLenRef = useRef(0);
  const conversationsRef = useRef([]);
  const settingsRef = useRef(settings);
  activeChatRef.current = state.activeChat;
  conversationsLenRef.current = state.conversations.length;
  conversationsRef.current = state.conversations;
  settingsRef.current = settings;

  useEffect(() => {
    if (!isAuthenticated || config.useMockAuth) return undefined;

    const markActiveRead = () => {
      const chat = activeChatRef.current;
      if (!chat?.id) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      chatService.markAsRead(chat.id).catch(() => {});
      dispatch({ type: CHAT_ACTIONS.MARK_READ, payload: chat.id });
    };

    const onFocus = () => markActiveRead();
    const onVis = () => {
      if (document.visibilityState === 'visible') markActiveRead();
    };

    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [isAuthenticated]);

  const loadConversations = useCallback(async ({ silent = false } = {}) => {
    // Never flip messagesLoading — that was jumping the chat view to the top on send
    if (!silent && conversationsLenRef.current === 0) {
      dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: true });
    }
    try {
      const data = await chatService.getConversations();
      dispatch({ type: CHAT_ACTIONS.SET_CONVERSATIONS, payload: data });
    } catch (error) {
      dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: false });
      console.error(error);
    }
  }, []);

  const selectChat = useCallback(async (conversation) => {
    dispatch({ type: CHAT_ACTIONS.SET_ACTIVE_CHAT, payload: conversation });
    dispatch({ type: 'SET_MESSAGES_LOADING', payload: true });
    dispatch({ type: 'CLEAR_MESSAGES' });
    try {
      socketService.joinChat(conversation.id);
      const messages = await chatService.getMessages(conversation.id);
      dispatch({ type: CHAT_ACTIONS.SET_MESSAGES, payload: messages });
      const latestId = messages.length ? messages[messages.length - 1].id : undefined;
      await chatService.markAsRead(conversation.id, latestId);
      dispatch({ type: CHAT_ACTIONS.MARK_READ, payload: conversation.id });
    } catch (error) {
      dispatch({ type: 'SET_MESSAGES_LOADING', payload: false });
      console.error(error);
    }
  }, []);

  const sendMessage = useCallback(
    async (text) => {
      if (!state.activeChat || !text.trim()) return null;
      socketService.emitTyping(state.activeChat.id, false);
      try {
        const message = await chatService.sendMessage(state.activeChat.id, text);
        dispatch({ type: CHAT_ACTIONS.ADD_MESSAGE, payload: message });
        await loadConversations({ silent: true });
        return message;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    [state.activeChat, loadConversations]
  );

  const sendMessageToChat = useCallback(
    async (chatId, text) => {
      if (!chatId || !String(text || '').trim()) return null;
      try {
        const message = await chatService.sendMessage(chatId, text);
        if (activeChatRef.current && String(activeChatRef.current.id) === String(chatId)) {
          dispatch({ type: CHAT_ACTIONS.ADD_MESSAGE, payload: message });
        }
        await loadConversations({ silent: true });
        return message;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    [loadConversations]
  );

  const deleteMessage = useCallback(
    async (messageId) => {
      if (!state.activeChat) return;
      try {
        await chatService.deleteMessage(state.activeChat.id, messageId);
        dispatch({
          type: 'REMOVE_MESSAGE',
          payload: messageId,
        });
      } catch (error) {
        console.error(error);
      }
    },
    [state.activeChat]
  );

  const editMessage = useCallback(
    async (messageId, text) => {
      if (!state.activeChat || !text?.trim()) return null;
      try {
        const message = await chatService.editMessage(state.activeChat.id, messageId, text);
        dispatch({ type: 'UPDATE_MESSAGE', payload: message });
        await loadConversations({ silent: true });
        return message;
      } catch (error) {
        console.error(error);
        throw error;
      }
    },
    [state.activeChat, loadConversations]
  );

  const createGroup = useCallback(
    async (payload) => {
      dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: true });
      try {
        const conversation = await chatService.createGroup(payload);
        dispatch({ type: CHAT_ACTIONS.ADD_CONVERSATION, payload: conversation });
        await selectChat(conversation);
        return conversation;
      } catch (error) {
        dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: false });
        throw error;
      }
    },
    [selectChat]
  );

  const createChannel = useCallback(
    async (payload) => {
      dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: true });
      try {
        const conversation = await chatService.createChannel(payload);
        dispatch({ type: CHAT_ACTIONS.ADD_CONVERSATION, payload: conversation });
        await selectChat(conversation);
        return conversation;
      } catch (error) {
        dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: false });
        throw error;
      }
    },
    [selectChat]
  );

  const startChatWithContact = useCallback(
    async (contact) => {
      dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: true });
      try {
        const conversation = await chatService.startChatWithContact(contact);
        dispatch({ type: CHAT_ACTIONS.ADD_CONVERSATION, payload: conversation });
        await selectChat(conversation);
        return conversation;
      } catch (error) {
        dispatch({ type: CHAT_ACTIONS.SET_LOADING, payload: false });
        throw error;
      }
    },
    [selectChat]
  );

  useEffect(() => {
    if (!isAuthenticated || config.useMockAuth) return undefined;

    const socket = socketService.connect();
    if (!socket) return undefined;

    const onNewMessage = (data) => {
      const mapped = chatService.mapSocketMessage(data, user?.id);
      const chatId = String(data?.chat?.id ?? data?.message_data?.chat_id ?? '');
      const isActive =
        activeChatRef.current && chatId === String(activeChatRef.current.id);

      if (isActive) {
        dispatch({ type: CHAT_ACTIONS.ADD_MESSAGE, payload: mapped });
        if (mapped.senderId !== 'me') {
          chatService.markAsRead(chatId, mapped.id).catch(() => {});
          dispatch({ type: CHAT_ACTIONS.MARK_READ, payload: chatId });
        }
      }

      const isMine = mapped.senderId === 'me';
      if (!isMine && !isActive) {
        const prefs = settingsRef.current?.notifications;
        const conv =
          conversationsRef.current.find((c) => String(c.id) === chatId) ||
          null;
        const chatType =
          conv?.type ||
          (data?.chat?.type === 'private'
            ? 'personal'
            : data?.chat?.type === 'group'
              ? 'groups'
              : data?.chat?.type === 'channel'
                ? 'channels'
                : 'personal');

        if (shouldNotifyForChatType(prefs, chatType)) {
          playInAppNotificationFeedback(prefs);
          if (prefs?.inAppPreview !== false && prefs?.preview !== false) {
            const preview = getMessagePreview(mapped.text, 80) || 'پیام جدید';
            const title = conv?.name || data?.sender?.display_name || 'پیام جدید';
            addToast(`${title}: ${preview}`, 'info');
          }
        }
      }

      loadConversations({ silent: true });
    };

    const onDeleteMessage = (data) => {
      if (
        activeChatRef.current &&
        String(data.chat_id) === String(activeChatRef.current.id)
      ) {
        dispatch({ type: 'REMOVE_MESSAGE', payload: data.message_id });
      }
    };

    const onEditMessage = (data) => {
      const mapped = chatService.mapSocketMessage(data, user?.id);
      const chatId = String(data?.chat?.id ?? '');
      if (activeChatRef.current && chatId === String(activeChatRef.current.id)) {
        dispatch({ type: 'UPDATE_MESSAGE', payload: mapped });
      }
      loadConversations({ silent: true });
    };

    const onMessagesRead = (data) => {
      const chatId = String(data?.chat_id ?? '');
      if (!chatId) return;
      const receiptsOn = settingsRef.current?.privacy?.readReceipts !== false;
      if (!receiptsOn) return;
      // Only personal chats show live seen ticks
      const active = activeChatRef.current;
      if (active && String(active.id) === chatId && active.type !== 'personal') {
        return;
      }
      dispatch({
        type: 'MARK_MESSAGES_READ',
        payload: {
          chatId,
          lastReadMessageId: data.last_read_message_id,
          readerId: data.reader_id,
          currentUserId: user?.id,
        },
      });
    };

    const onTyping = (data) => {
      dispatch({
        type: CHAT_ACTIONS.SET_TYPING,
        payload: { chatId: String(data.chat_id), isTyping: true },
      });
    };

    const onStopTyping = (data) => {
      dispatch({
        type: CHAT_ACTIONS.SET_TYPING,
        payload: { chatId: String(data.chat_id), isTyping: false },
      });
    };

    const onOnline = (data) => {
      dispatch({
        type: 'SET_ONLINE',
        payload: { userId: data.userId, online: true },
      });
    };

    const onOffline = (data) => {
      dispatch({
        type: 'SET_ONLINE',
        payload: {
          userId: data.userId,
          online: false,
          lastSeenAt: data.last_seen_at || new Date().toISOString(),
        },
      });
    };

    socket.on('new_message', onNewMessage);
    socket.on('delete_message', onDeleteMessage);
    socket.on('edit_message', onEditMessage);
    socket.on('messages_read', onMessagesRead);
    socket.on('typing', onTyping);
    socket.on('stop_typing', onStopTyping);
    socket.on('user_online', onOnline);
    socket.on('user_offline', onOffline);

    return () => {
      socket.off('new_message', onNewMessage);
      socket.off('delete_message', onDeleteMessage);
      socket.off('edit_message', onEditMessage);
      socket.off('messages_read', onMessagesRead);
      socket.off('typing', onTyping);
      socket.off('stop_typing', onStopTyping);
      socket.off('user_online', onOnline);
      socket.off('user_offline', onOffline);
    };
  }, [isAuthenticated, user?.id, loadConversations, addToast]);

  return (
    <ChatContext.Provider
      value={{
        ...state,
        loadConversations,
        selectChat,
        sendMessage,
        sendMessageToChat,
        deleteMessage,
        editMessage,
        createGroup,
        createChannel,
        startChatWithContact,
        dispatch,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
}

export function useChat() {
  const context = useContext(ChatContext);
  if (!context) throw new Error('useChat must be used within ChatProvider');
  return context;
}
