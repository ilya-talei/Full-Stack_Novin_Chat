const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

export function createPeerConnection({ onIceCandidate, onTrack, onConnectionState }) {
  const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
  pc.onicecandidate = (ev) => {
    if (ev.candidate) onIceCandidate?.(ev.candidate);
  };
  pc.ontrack = (ev) => onTrack?.(ev);
  pc.onconnectionstatechange = () => onConnectionState?.(pc.connectionState);
  return pc;
}

export async function getCallMedia({ video = false } = {}) {
  return navigator.mediaDevices.getUserMedia({
    audio: true,
    video: video ? { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } } : false,
  });
}

export function stopStream(stream) {
  stream?.getTracks?.().forEach((t) => {
    try {
      t.stop();
    } catch {
      /* ignore */
    }
  });
}

export function setStreamMuted(stream, muted) {
  stream?.getAudioTracks?.().forEach((t) => {
    t.enabled = !muted;
  });
}

export function setStreamVideoEnabled(stream, enabled) {
  stream?.getVideoTracks?.().forEach((t) => {
    t.enabled = enabled;
  });
}
