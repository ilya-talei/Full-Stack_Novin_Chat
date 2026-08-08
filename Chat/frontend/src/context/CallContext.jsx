import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAuth } from '@context/AuthContext';
import { useChat } from '@context/ChatContext';
import { socketService } from '@services/socketService';
import {
  createPeerConnection,
  getCallMedia,
  setStreamMuted,
  setStreamVideoEnabled,
  stopStream,
} from '@services/webrtcCall';
import { encodeCallMessage } from '@features/chat/utils/messageMeta';

const RING_TIMEOUT_MS = 45000;

export const CALL_STATES = {
  IDLE: 'idle',
  OUTGOING: 'outgoing',
  INCOMING: 'incoming',
  CONNECTED: 'connected',
};

const CallContext = createContext(null);

function displayNameOf(user) {
  return user?.display_name || user?.displayName || user?.name || user?.login_id || user?.username || 'کاربر';
}

export function CallProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { conversations, selectChat, startChatWithContact, sendMessageToChat } = useChat();

  const [status, setStatus] = useState(CALL_STATES.IDLE);
  const [peer, setPeer] = useState(null); // { userId, chatId, name, avatar, video, isGroup }
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(false);
  const [duration, setDuration] = useState(0);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [error, setError] = useState(null);

  const pcRef = useRef(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  const statusRef = useRef(status);
  const peerRef = useRef(peer);
  const answeredRef = useRef(false);
  const ringTimerRef = useRef(null);
  const makingOfferRef = useRef(false);
  const pendingIceRef = useRef([]);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  const clearRingTimer = () => {
    if (ringTimerRef.current) {
      clearTimeout(ringTimerRef.current);
      ringTimerRef.current = null;
    }
  };

  const cleanupMedia = useCallback(() => {
    clearRingTimer();
    try {
      pcRef.current?.close();
    } catch {
      /* ignore */
    }
    pcRef.current = null;
    stopStream(localRef.current);
    stopStream(remoteRef.current);
    localRef.current = null;
    remoteRef.current = null;
    setLocalStream(null);
    setRemoteStream(null);
    pendingIceRef.current = [];
    makingOfferRef.current = false;
  }, []);

  const resetCall = useCallback(() => {
    cleanupMedia();
    answeredRef.current = false;
    setStatus(CALL_STATES.IDLE);
    setPeer(null);
    setMuted(false);
    setVideoOff(false);
    setDuration(0);
    setError(null);
  }, [cleanupMedia]);

  const postMissedCall = useCallback(
    async (target, reason = 'missed') => {
      if (!target?.chatId) return;
      try {
        const content = encodeCallMessage(reason, {
          callerName: displayNameOf(user),
          at: new Date(),
          video: Boolean(target.video),
        });
        await sendMessageToChat(target.chatId, content);
      } catch {
        /* ignore */
      }
    },
    [user, sendMessageToChat]
  );

  const ensurePc = useCallback(() => {
    if (pcRef.current) return pcRef.current;
    const pc = createPeerConnection({
      onIceCandidate: (candidate) => {
        const p = peerRef.current;
        if (!p?.userId && !p?.isGroup) return;
        socketService.sendCallEvent('call_ice', {
          toUserId: p.userId ? Number(p.userId) : undefined,
          chat_id: p.chatId ? Number(p.chatId) : undefined,
          broadcast: Boolean(p.isGroup && !p.userId),
          payload: { candidate },
        });
      },
      onTrack: (ev) => {
        const stream = ev.streams?.[0] || new MediaStream([ev.track]);
        remoteRef.current = stream;
        setRemoteStream(stream);
      },
      onConnectionState: (state) => {
        if (state === 'failed' || state === 'disconnected' || state === 'closed') {
          if (statusRef.current === CALL_STATES.CONNECTED) {
            resetCall();
          }
        }
      },
    });
    pcRef.current = pc;
    return pc;
  }, [resetCall]);

  const attachLocal = useCallback(async (wantVideo) => {
    const stream = await getCallMedia({ video: wantVideo });
    localRef.current = stream;
    setLocalStream(stream);
    const pc = ensurePc();
    stream.getTracks().forEach((track) => pc.addTrack(track, stream));
    return stream;
  }, [ensurePc]);

  const flushIce = useCallback(async () => {
    const pc = pcRef.current;
    if (!pc?.remoteDescription) return;
    const queued = pendingIceRef.current.splice(0);
    for (const c of queued) {
      try {
        await pc.addIceCandidate(c);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const startCall = useCallback(
    async ({ userId, chatId, name, avatar, video = false, isGroup = false }) => {
      if (statusRef.current !== CALL_STATES.IDLE) return;
      if (!isGroup && !userId) {
        setError('مخاطب نامعتبر است');
        return;
      }
      if (isGroup && !chatId) {
        setError('گروه نامعتبر است');
        return;
      }

      setError(null);
      answeredRef.current = false;
      const nextPeer = {
        userId: userId ? String(userId) : null,
        chatId: chatId ? String(chatId) : null,
        name: name || 'مخاطب',
        avatar: avatar || '',
        video: Boolean(video),
        isGroup: Boolean(isGroup),
        direction: 'out',
      };
      setPeer(nextPeer);
      peerRef.current = nextPeer;
      setVideoOff(!video);
      setStatus(CALL_STATES.OUTGOING);

      try {
        await attachLocal(Boolean(video));
        makingOfferRef.current = true;
        const pc = ensurePc();
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        makingOfferRef.current = false;

        socketService.sendCallEvent('call_offer', {
          toUserId: userId ? Number(userId) : undefined,
          chat_id: chatId ? Number(chatId) : undefined,
          broadcast: Boolean(isGroup),
          payload: {
            sdp: offer,
            video: Boolean(video),
            callerName: displayNameOf(user),
            chatId: chatId ? Number(chatId) : undefined,
            isGroup: Boolean(isGroup),
          },
        });

        clearRingTimer();
        ringTimerRef.current = setTimeout(async () => {
          if (statusRef.current !== CALL_STATES.OUTGOING || answeredRef.current) return;
          const p = peerRef.current;
          socketService.sendCallEvent('call_end', {
            toUserId: p?.userId ? Number(p.userId) : undefined,
            chat_id: p?.chatId ? Number(p.chatId) : undefined,
            broadcast: Boolean(p?.isGroup),
            payload: { reason: 'timeout' },
          });
          await postMissedCall(p, 'missed');
          resetCall();
        }, RING_TIMEOUT_MS);
      } catch (err) {
        setError(err?.message || 'دسترسی به میکروفون/دوربین لازم است');
        resetCall();
      }
    },
    [attachLocal, ensurePc, user, postMissedCall, resetCall]
  );

  const acceptCall = useCallback(async () => {
    const p = peerRef.current;
    if (!p || statusRef.current !== CALL_STATES.INCOMING) return;
    clearRingTimer();
    answeredRef.current = true;
    setError(null);
    try {
      const offer = p.remoteOffer;
      if (!offer) throw new Error('پیشنهاد تماس نامعتبر است');
      await attachLocal(Boolean(p.video));
      const pc = ensurePc();
      await pc.setRemoteDescription(offer);
      await flushIce();
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketService.sendCallEvent('call_answer', {
        toUserId: Number(p.userId),
        chat_id: p.chatId ? Number(p.chatId) : undefined,
        payload: { sdp: answer },
      });
      setStatus(CALL_STATES.CONNECTED);
    } catch (err) {
      setError(err?.message || 'پذیرش تماس ناموفق بود');
      socketService.sendCallEvent('call_end', {
        toUserId: Number(p.userId),
        chat_id: p.chatId ? Number(p.chatId) : undefined,
        payload: { reason: 'error' },
      });
      resetCall();
    }
  }, [attachLocal, ensurePc, flushIce, resetCall]);

  const rejectCall = useCallback(() => {
    const p = peerRef.current;
    if (p?.userId) {
      socketService.sendCallEvent('call_end', {
        toUserId: Number(p.userId),
        chat_id: p.chatId ? Number(p.chatId) : undefined,
        payload: { reason: 'rejected' },
      });
    }
    resetCall();
  }, [resetCall]);

  const endCall = useCallback(
    async ({ sendMissed = false } = {}) => {
      const p = peerRef.current;
      const wasOutgoingRing = statusRef.current === CALL_STATES.OUTGOING && !answeredRef.current;
      if (p) {
        socketService.sendCallEvent('call_end', {
          toUserId: p.userId ? Number(p.userId) : undefined,
          chat_id: p.chatId ? Number(p.chatId) : undefined,
          broadcast: Boolean(p.isGroup && statusRef.current === CALL_STATES.OUTGOING),
          payload: { reason: wasOutgoingRing ? 'cancelled' : 'hangup' },
        });
      }
      if (sendMissed || wasOutgoingRing) {
        await postMissedCall(p, wasOutgoingRing ? 'missed' : 'missed');
      }
      resetCall();
    },
    [postMissedCall, resetCall]
  );

  const toggleMute = useCallback(() => {
    setMuted((m) => {
      const next = !m;
      setStreamMuted(localRef.current, next);
      return next;
    });
  }, []);

  const toggleVideo = useCallback(() => {
    setVideoOff((v) => {
      const next = !v;
      setStreamVideoEnabled(localRef.current, !next);
      return next;
    });
  }, []);

  const callContact = useCallback(
    async (contact, { video = false } = {}) => {
      try {
        const conversation = await startChatWithContact(contact);
        selectChat?.(conversation);
        await startCall({
          userId: conversation.peerUserId || contact.id,
          chatId: conversation.id,
          name: conversation.name || contact.name,
          avatar: conversation.avatar || contact.avatar,
          video,
          isGroup: false,
        });
      } catch (err) {
        setError(err?.message || 'شروع تماس ناموفق بود');
      }
    },
    [startChatWithContact, selectChat, startCall]
  );

  const callConversation = useCallback(
    async (conversation, { video = false } = {}) => {
      if (!conversation) return;
      if (conversation.type === 'channels' || conversation.type === 'channel') {
        setError('تماس در کانال مجاز نیست');
        return;
      }
      const isGroup = conversation.type === 'groups' || conversation.type === 'group';
      if (!isGroup && !conversation.peerUserId) {
        setError('این گفتگو قابل تماس نیست');
        return;
      }
      selectChat?.(conversation);
      await startCall({
        userId: conversation.peerUserId,
        chatId: conversation.id,
        name: conversation.name,
        avatar: conversation.avatar,
        video,
        isGroup,
      });
    },
    [selectChat, startCall]
  );

  // Duration ticker
  useEffect(() => {
    if (status !== CALL_STATES.CONNECTED) return undefined;
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  // Socket listeners
  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const socket = socketService.connect();
    if (!socket) return undefined;

    const onOffer = async (packet) => {
      if (statusRef.current !== CALL_STATES.IDLE) {
        // busy — reject politely
        if (packet?.fromUserId) {
          socketService.sendCallEvent('call_end', {
            toUserId: Number(packet.fromUserId),
            chat_id: packet.chat_id,
            payload: { reason: 'busy' },
          });
        }
        return;
      }
      const payload = packet?.payload || {};
      const sdp = payload.sdp;
      if (!sdp) return;

      const chatId = packet.chat_id || payload.chatId;
      const conv = conversations?.find((c) => String(c.id) === String(chatId));
      const nextPeer = {
        userId: String(packet.fromUserId),
        chatId: chatId ? String(chatId) : null,
        name: payload.callerName || conv?.name || `کاربر ${packet.fromUserId}`,
        avatar: conv?.avatar || '',
        video: Boolean(payload.video),
        isGroup: Boolean(payload.isGroup),
        direction: 'in',
        remoteOffer: sdp,
      };
      setPeer(nextPeer);
      peerRef.current = nextPeer;
      setVideoOff(!payload.video);
      setStatus(CALL_STATES.INCOMING);
      answeredRef.current = false;

      clearRingTimer();
      ringTimerRef.current = setTimeout(() => {
        if (statusRef.current !== CALL_STATES.INCOMING) return;
        socketService.sendCallEvent('call_end', {
          toUserId: Number(packet.fromUserId),
          chat_id: chatId,
          payload: { reason: 'timeout' },
        });
        resetCall();
      }, RING_TIMEOUT_MS);
    };

    const onAnswer = async (packet) => {
      if (statusRef.current !== CALL_STATES.OUTGOING) return;
      const sdp = packet?.payload?.sdp;
      if (!sdp || !pcRef.current) return;
      answeredRef.current = true;
      clearRingTimer();
      try {
        // If group, lock onto the answerer
        if (packet.fromUserId) {
          setPeer((prev) =>
            prev
              ? { ...prev, userId: String(packet.fromUserId), isGroup: false }
              : prev
          );
          peerRef.current = {
            ...peerRef.current,
            userId: String(packet.fromUserId),
            isGroup: false,
          };
        }
        await pcRef.current.setRemoteDescription(sdp);
        await flushIce();
        setStatus(CALL_STATES.CONNECTED);
      } catch {
        resetCall();
      }
    };

    const onIce = async (packet) => {
      const candidate = packet?.payload?.candidate;
      if (!candidate) return;
      const pc = pcRef.current;
      if (!pc) return;
      if (!pc.remoteDescription) {
        pendingIceRef.current.push(candidate);
        return;
      }
      try {
        await pc.addIceCandidate(candidate);
      } catch {
        /* ignore */
      }
    };

    const onEnd = async (packet) => {
      const reason = packet?.payload?.reason;
      const p = peerRef.current;
      const wasOutRing = statusRef.current === CALL_STATES.OUTGOING && !answeredRef.current;
      // Caller side already posts missed on hangup/timeout; if callee rejected while we ring, also post
      if (wasOutRing && (reason === 'rejected' || reason === 'busy' || reason === 'timeout')) {
        await postMissedCall(p, 'missed');
      }
      resetCall();
    };

    socket.on('call_offer', onOffer);
    socket.on('call_answer', onAnswer);
    socket.on('call_ice', onIce);
    socket.on('call_end', onEnd);
    return () => {
      socket.off('call_offer', onOffer);
      socket.off('call_answer', onAnswer);
      socket.off('call_ice', onIce);
      socket.off('call_end', onEnd);
    };
  }, [isAuthenticated, conversations, flushIce, resetCall, postMissedCall]);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  const value = useMemo(
    () => ({
      status,
      peer,
      muted,
      videoOff,
      duration,
      localStream,
      remoteStream,
      error,
      isInCall: status !== CALL_STATES.IDLE,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      callContact,
      callConversation,
      resetCall,
    }),
    [
      status,
      peer,
      muted,
      videoOff,
      duration,
      localStream,
      remoteStream,
      error,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo,
      callContact,
      callConversation,
      resetCall,
    ]
  );

  return <CallContext.Provider value={value}>{children}</CallContext.Provider>;
}

export function useCall() {
  const ctx = useContext(CallContext);
  if (!ctx) throw new Error('useCall must be used within CallProvider');
  return ctx;
}
