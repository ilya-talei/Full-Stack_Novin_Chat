import { useEffect, useRef, useState } from 'react';
import {
  FiMic,
  FiMicOff,
  FiPhone,
  FiPhoneOff,
  FiVideo,
  FiVideoOff,
} from 'react-icons/fi';
import Avatar from '@components/ui/Avatar';
import { useCall, CALL_STATES } from '@context/CallContext';
import { streamHasLiveVideo } from '@services/webrtcCall';
import '../pages/call-page.css';

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function bindStream(el, stream) {
  if (!el) return;
  if (el.srcObject !== stream) {
    el.srcObject = stream || null;
  }
  if (stream) {
    const play = el.play?.();
    if (play?.catch) play.catch(() => {});
  }
}

export default function CallStage({ className = '' }) {
  const {
    status,
    peer,
    muted,
    videoOff,
    duration,
    localStream,
    remoteStream,
    error,
    acceptCall,
    rejectCall,
    endCall,
    toggleMute,
    toggleVideo,
  } = useCall();

  const localVideoRef = useRef(null);
  const remoteVideoRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [, bump] = useState(0);

  // Re-render when remote tracks mute/unmute so video stage updates
  useEffect(() => {
    if (!remoteStream) return undefined;
    const onChange = () => bump((n) => n + 1);
    const tracks = remoteStream.getTracks();
    tracks.forEach((t) => {
      t.addEventListener('mute', onChange);
      t.addEventListener('unmute', onChange);
      t.addEventListener('ended', onChange);
    });
    return () => {
      tracks.forEach((t) => {
        t.removeEventListener('mute', onChange);
        t.removeEventListener('unmute', onChange);
        t.removeEventListener('ended', onChange);
      });
    };
  }, [remoteStream]);

  const remoteHasVideo = streamHasLiveVideo(remoteStream);
  const localHasVideo = streamHasLiveVideo(localStream) && !videoOff;
  const showVideoStage = remoteHasVideo || localHasVideo;

  // Keep media elements mounted; re-bind whenever streams / stage mode changes
  useEffect(() => {
    bindStream(localVideoRef.current, localStream);
  }, [localStream, showVideoStage, localHasVideo]);

  useEffect(() => {
    bindStream(remoteVideoRef.current, remoteStream);
    bindStream(remoteAudioRef.current, remoteStream);
  }, [remoteStream, showVideoStage, remoteHasVideo]);

  const isIncoming = status === CALL_STATES.INCOMING;
  const isOutgoing = status === CALL_STATES.OUTGOING;
  const isConnected = status === CALL_STATES.CONNECTED;

  const statusLabel = isIncoming
    ? peer?.cameraPreferred
      ? 'تماس تصویری ورودی'
      : 'تماس ورودی'
    : isOutgoing
      ? 'در حال برقراری تماس...'
      : isConnected
        ? formatDuration(duration)
        : '';

  return (
    <div
      className={`call-stage ${showVideoStage ? 'call-stage--video' : 'call-stage--voice'} ${className}`.trim()}
    >
      <div className="call-stage__bg" aria-hidden>
        <span className="call-stage__orb call-stage__orb--a" />
        <span className="call-stage__orb call-stage__orb--b" />
        <span className="call-stage__orb call-stage__orb--c" />
      </div>

      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        className="call-stage__hidden-audio"
      />

      <div className="call-stage__top">
        <span className="call-stage__badge">
          {showVideoStage ? 'تماس تصویری' : 'تماس صوتی'}
        </span>
      </div>

      <div className="call-stage__media">
        {/* Always mount videos so srcObject survives toggles */}
        <div
          className={`call-stage__videos ${showVideoStage ? 'is-visible' : 'is-hidden'}`}
          aria-hidden={!showVideoStage}
        >
          <video
            ref={remoteVideoRef}
            className={`call-stage__remote ${remoteHasVideo ? '' : 'is-empty'}`}
            autoPlay
            playsInline
            muted
          />
          <div
            className={`call-stage__local-wrap ${localHasVideo ? 'is-on' : 'is-off'}`}
          >
            <video
              ref={localVideoRef}
              className="call-stage__local"
              autoPlay
              playsInline
              muted
            />
            {!localHasVideo ? (
              <div className="call-stage__local-fallback">
                <Avatar src={peer?.avatar} alt="شما" size="sm" />
              </div>
            ) : null}
          </div>
          {!remoteHasVideo && showVideoStage ? (
            <div className="call-stage__remote-fallback">
              <Avatar src={peer?.avatar} alt={peer?.name} size="lg" />
              <p>{peer?.name}</p>
            </div>
          ) : null}
        </div>

        <div
          className={`call-stage__avatar-wrap ${showVideoStage ? 'is-hidden' : 'is-visible'}`}
          aria-hidden={showVideoStage}
        >
          <div className="call-stage__ring" aria-hidden />
          <div className="call-stage__ring call-stage__ring--delay" aria-hidden />
          <div className="call-stage__avatar">
            <Avatar src={peer?.avatar} alt={peer?.name} size="lg" />
          </div>
        </div>
      </div>

      <div className="call-stage__meta">
        <h2 className="call-stage__name">{peer?.name || 'تماس'}</h2>
        <p className="call-stage__status">
          <span className={`call-stage__dot ${isConnected ? 'is-live' : 'is-ring'}`} />
          {statusLabel}
        </p>
        {error ? <p className="call-stage__error">{error}</p> : null}
      </div>

      <div className="call-stage__dock">
        {(isConnected || isOutgoing || isIncoming) && (
          <div className="call-stage__controls">
            <button
              type="button"
              className={`call-ctrl ${muted ? 'is-off' : ''}`}
              onClick={toggleMute}
              aria-label={muted ? 'لغو سکوت' : 'سکوت'}
            >
              {muted ? <FiMicOff size={22} /> : <FiMic size={22} />}
              <span className="call-ctrl__label">{muted ? 'بی‌صدا' : 'میکروفون'}</span>
            </button>

            <button
              type="button"
              className={`call-ctrl ${videoOff || !localHasVideo ? 'is-off' : ''}`}
              onClick={() => toggleVideo()}
              aria-label={videoOff ? 'روشن کردن دوربین' : 'خاموش کردن دوربین'}
            >
              {videoOff || !localHasVideo ? <FiVideoOff size={22} /> : <FiVideo size={22} />}
              <span className="call-ctrl__label">دوربین</span>
            </button>

            {isIncoming ? (
              <>
                <button
                  type="button"
                  className="call-ctrl call-ctrl--accept"
                  onClick={acceptCall}
                  aria-label="پذیرش"
                >
                  <FiPhone size={26} />
                  <span className="call-ctrl__label">پذیرش</span>
                </button>
                <button
                  type="button"
                  className="call-ctrl call-ctrl--hang"
                  onClick={rejectCall}
                  aria-label="رد"
                >
                  <FiPhoneOff size={24} />
                  <span className="call-ctrl__label">رد</span>
                </button>
              </>
            ) : (
              <button
                type="button"
                className="call-ctrl call-ctrl--hang"
                onClick={() => endCall()}
                aria-label="قطع تماس"
              >
                <FiPhoneOff size={24} />
                <span className="call-ctrl__label">قطع</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
