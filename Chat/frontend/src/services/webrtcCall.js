const ICE_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }];

const VIDEO_CONSTRAINTS = {
  facingMode: 'user',
  width: { ideal: 1280 },
  height: { ideal: 720 },
};

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
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('تماس فقط در اپلیکیشن یا اتصال امن HTTPS قابل استفاده است');
  }

  const audio = {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
  };

  const constraints = {
    audio,
    video: video ? VIDEO_CONSTRAINTS : false,
  };

  try {
    return await navigator.mediaDevices.getUserMedia(constraints);
  } catch (error) {
    // A missing/blocked camera must not prevent accepting the call as audio.
    if (video) {
      try {
        return await navigator.mediaDevices.getUserMedia({
          audio,
          video: false,
        });
      } catch {
        /* surface the original, more useful permission/device error */
      }
    }
    throw error;
  }
}

/** Camera-only stream for mid-call upgrade. */
export async function getCameraTrack() {
  if (!navigator.mediaDevices?.getUserMedia) {
    throw new Error('دوربین فقط در اپلیکیشن یا اتصال امن HTTPS قابل استفاده است');
  }
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: false,
    video: VIDEO_CONSTRAINTS,
  });
  return stream.getVideoTracks()[0] || null;
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

export function streamHasLiveVideo(stream) {
  return Boolean(stream?.getVideoTracks?.().some((t) => t.readyState === 'live' && t.enabled));
}
