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
import { useToast } from '@components/ui/Toast';
import { socketService } from '@services/socketService';
import {
  createPeerConnection,
  getCallMedia,
  getCameraTrack,
  setStreamMuted,
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

function mergeRemoteTrack(remoteRef, setRemoteStream, ev) {
  let stream = remoteRef.current;
  if (!stream) {
    stream = new MediaStream();
    remoteRef.current = stream;
  }

  const incoming = [];
  if (ev.streams?.[0]) {
    ev.streams[0].getTracks().forEach((t) => incoming.push(t));
  } else if (ev.track) {
    incoming.push(ev.track);
  }

  let changed = false;
  for (const track of incoming) {
    if (!stream.getTracks().some((t) => t.id === track.id)) {
      stream.addTrack(track);
      changed = true;
      track.addEventListener('ended', () => {
        try {
          stream.removeTrack(track);
        } catch {
          /* ignore */
        }
        setRemoteStream(new MediaStream(stream.getTracks()));
      });
    }
  }

  if (changed || !remoteRef.current) {
    setRemoteStream(new MediaStream(stream.getTracks()));
  }
}

export function CallProvider({ children }) {
  const { user, isAuthenticated } = useAuth();
  const { conversations, selectChat, startChatWithContact, sendMessageToChat } = useChat();
  const { addToast } = useToast();

  const [status, setStatus] = useState(CALL_STATES.IDLE);
  const [peer, setPeer] = useState(null);
  const [muted, setMuted] = useState(false);
  const [videoOff, setVideoOff] = useState(true);
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
  const conversationsRef = useRef(conversations);

  useEffect(() => {
    statusRef.current = status;
  }, [status]);

  useEffect(() => {
    peerRef.current = peer;
  }, [peer]);

  useEffect(() => {
    conversationsRef.current = conversations;
  }, [conversations]);

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
    statusRef.current = CALL_STATES.IDLE;
    setStatus(CALL_STATES.IDLE);
    setPeer(null);
    setMuted(false);
    setVideoOff(true);
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
      onTrack: (ev) => mergeRemoteTrack(remoteRef, setRemoteStream, ev),
      onConnectionState: (state) => {
        // "disconnected" is commonly transient on mobile network changes.
        // Normal closure is handled by call_end/resetCall.
        if (state === 'failed') {
          if (statusRef.current === CALL_STATES.CONNECTED) {
            addToast('اتصال تماس قطع شد', 'error');
            resetCall();
          }
        }
      },
    });
    pcRef.current = pc;
    return pc;
  }, [addToast, resetCall]);

  const attachLocal = useCallback(
    async (wantVideo) => {
      const stream = await getCallMedia({ video: wantVideo });
      localRef.current = stream;
      setLocalStream(stream);
      const pc = ensurePc();
      stream.getTracks().forEach((track) => {
        const already = pc.getSenders().some((s) => s.track?.id === track.id);
        if (!already) pc.addTrack(track, stream);
      });
      return stream;
    },
    [ensurePc]
  );

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

  const sendRenegotiateOffer = useCallback(async () => {
    const p = peerRef.current;
    const pc = pcRef.current;
    if (!pc || !p?.userId) return;
    makingOfferRef.current = true;
    try {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketService.sendCallEvent('call_offer', {
        toUserId: Number(p.userId),
        chat_id: p.chatId ? Number(p.chatId) : undefined,
        payload: {
          sdp: offer,
          video: true,
          renegotiate: true,
          callerName: displayNameOf(user),
          chatId: p.chatId ? Number(p.chatId) : undefined,
        },
      });
    } finally {
      makingOfferRef.current = false;
    }
  }, [user]);

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
        // Unified call: always camera-capable; video flag = start with camera on
        video: true,
        cameraPreferred: Boolean(video),
        isGroup: Boolean(isGroup),
        direction: 'out',
      };
      setPeer(nextPeer);
      peerRef.current = nextPeer;
      setVideoOff(!video);
      statusRef.current = CALL_STATES.OUTGOING;
      setStatus(CALL_STATES.OUTGOING);

      try {
        const stream = await attachLocal(Boolean(video));
        setVideoOff(stream.getVideoTracks().length === 0);
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
        const message = err?.message || 'دسترسی به میکروفون/دوربین لازم است';
        setError(message);
        addToast(message, 'error');
        resetCall();
      }
    },
    [attachLocal, ensurePc, user, postMissedCall, resetCall, addToast]
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
      const wantVideo = Boolean(p.cameraPreferred);
      const stream = await attachLocal(wantVideo);
      setVideoOff(stream.getVideoTracks().length === 0);
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
      statusRef.current = CALL_STATES.CONNECTED;
      setStatus(CALL_STATES.CONNECTED);
    } catch (err) {
      const message = err?.message || 'پذیرش تماس ناموفق بود';
      setError(message);
      addToast(message, 'error');
      socketService.sendCallEvent('call_end', {
        toUserId: Number(p.userId),
        chat_id: p.chatId ? Number(p.chatId) : undefined,
        payload: { reason: 'error' },
      });
      resetCall();
    }
  }, [attachLocal, ensurePc, flushIce, resetCall, addToast]);

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

  const toggleVideo = useCallback(async () => {
    const stream = localRef.current;
    const existing = stream?.getVideoTracks?.()?.[0];

    // Turn camera off
    if (existing?.enabled) {
      existing.enabled = false;
      setVideoOff(true);
      return;
    }

    // Re-enable existing track
    if (existing) {
      existing.enabled = true;
      setVideoOff(false);
      setPeer((prev) => (prev ? { ...prev, video: true, cameraPreferred: true } : prev));
      if (peerRef.current) {
        peerRef.current = { ...peerRef.current, video: true, cameraPreferred: true };
      }
      return;
    }

    // Mid-call upgrade: add camera track + renegotiate
    try {
      setError(null);
      const track = await getCameraTrack();
      if (!track) throw new Error('دوربین در دسترس نیست');

      const pc = ensurePc();
      let local = localRef.current;
      if (!local) {
        local = new MediaStream();
        localRef.current = local;
      }
      local.addTrack(track);
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) {
        await sender.replaceTrack(track);
      } else {
        pc.addTrack(track, local);
      }
      setLocalStream(new MediaStream(local.getTracks()));
      setVideoOff(false);
      setPeer((prev) => (prev ? { ...prev, video: true, cameraPreferred: true } : prev));
      if (peerRef.current) {
        peerRef.current = { ...peerRef.current, video: true, cameraPreferred: true };
      }

      if (statusRef.current === CALL_STATES.CONNECTED) {
        await sendRenegotiateOffer();
      }
    } catch (err) {
      setError(err?.message || 'فعال‌سازی دوربین ناموفق بود');
    }
  }, [ensurePc, sendRenegotiateOffer]);

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

  useEffect(() => {
    if (status !== CALL_STATES.CONNECTED) return undefined;
    const t = setInterval(() => setDuration((d) => d + 1), 1000);
    return () => clearInterval(t);
  }, [status]);

  useEffect(() => {
    if (!isAuthenticated) return undefined;
    const socket = socketService.connect();
    if (!socket) return undefined;

    const onOffer = async (packet) => {
      const payload = packet?.payload || {};
      const sdp = payload.sdp;
      if (!sdp) return;

      // Mid-call renegotiation (camera upgrade)
      if (payload.renegotiate && statusRef.current === CALL_STATES.CONNECTED && pcRef.current) {
        try {
          await pcRef.current.setRemoteDescription(sdp);
          await flushIce();
          const answer = await pcRef.current.createAnswer();
          await pcRef.current.setLocalDescription(answer);
          socketService.sendCallEvent('call_answer', {
            toUserId: Number(packet.fromUserId),
            chat_id: packet.chat_id || payload.chatId,
            payload: { sdp: answer, renegotiate: true },
          });
          setPeer((prev) => (prev ? { ...prev, video: true } : prev));
        } catch {
          /* ignore renegotiate errors */
        }
        return;
      }

      if (statusRef.current !== CALL_STATES.IDLE) {
        if (packet?.fromUserId) {
          socketService.sendCallEvent('call_end', {
            toUserId: Number(packet.fromUserId),
            chat_id: packet.chat_id,
            payload: { reason: 'busy' },
          });
        }
        return;
      }

      const chatId = packet.chat_id || payload.chatId;
      const conv = conversationsRef.current?.find((c) => String(c.id) === String(chatId));
      const nextPeer = {
        userId: String(packet.fromUserId),
        chatId: chatId ? String(chatId) : null,
        name: payload.callerName || conv?.name || `کاربر ${packet.fromUserId}`,
        avatar: conv?.avatar || '',
        video: true,
        cameraPreferred: Boolean(payload.video),
        isGroup: Boolean(payload.isGroup),
        direction: 'in',
        remoteOffer: sdp,
      };
      setPeer(nextPeer);
      peerRef.current = nextPeer;
      setVideoOff(!payload.video);
      statusRef.current = CALL_STATES.INCOMING;
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
      const sdp = packet?.payload?.sdp;
      if (!sdp || !pcRef.current) return;

      // Renegotiation (camera upgrade) while already in a call
      if (
        statusRef.current === CALL_STATES.CONNECTED ||
        packet?.payload?.renegotiate
      ) {
        try {
          await pcRef.current.setRemoteDescription(sdp);
          await flushIce();
        } catch {
          /* ignore */
        }
        return;
      }

      if (statusRef.current !== CALL_STATES.OUTGOING) return;
      answeredRef.current = true;
      clearRingTimer();
      try {
        const wasGroup = Boolean(peerRef.current?.isGroup);
        const chatId = peerRef.current?.chatId;
        if (packet.fromUserId) {
          const nextPeer = {
            ...peerRef.current,
            userId: String(packet.fromUserId),
            isGroup: false,
          };
          peerRef.current = nextPeer;
          setPeer(nextPeer);
        }
        await pcRef.current.setRemoteDescription(sdp);
        await flushIce();
        statusRef.current = CALL_STATES.CONNECTED;
        setStatus(CALL_STATES.CONNECTED);
        if (wasGroup && chatId) {
          socketService.sendCallEvent('call_end', {
            chat_id: Number(chatId),
            broadcast: true,
            payload: { reason: 'taken', takenBy: packet.fromUserId },
          });
        }
      } catch {
        resetCall();
      }
    };

    const onIce = async (packet) => {
      const candidate = packet?.payload?.candidate;
      if (!candidate) return;
      const activePeerId = peerRef.current?.userId;
      if (
        activePeerId &&
        packet?.fromUserId &&
        String(packet.fromUserId) !== String(activePeerId)
      ) {
        return;
      }
      const pc = pcRef.current;
      // Trickle ICE often arrives while the incoming notification is still
      // waiting for an answer and before a peer connection exists.
      if (!pc || !pc.remoteDescription) {
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
      const fromId = packet?.fromUserId != null ? String(packet.fromUserId) : null;

      // Another member answered a group ring; stay connected if we are the one.
      if (reason === 'taken') {
        if (statusRef.current === CALL_STATES.CONNECTED) return;
        resetCall();
        return;
      }

      if (p?.userId && fromId && fromId !== String(p.userId)) return;

      const wasOutRing = statusRef.current === CALL_STATES.OUTGOING && !answeredRef.current;
      if (
        wasOutRing &&
        p?.isGroup &&
        (reason === 'rejected' || reason === 'busy' || reason === 'timeout')
      ) {
        return;
      }
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
  }, [isAuthenticated, flushIce, resetCall, postMissedCall]);

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
