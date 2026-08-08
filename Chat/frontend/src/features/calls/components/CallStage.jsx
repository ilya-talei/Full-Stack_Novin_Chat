import { useEffect, useRef } from 'react';
import { FiMic, FiMicOff, FiPhone, FiPhoneOff, FiVideo, FiVideoOff } from 'react-icons/fi';
import Avatar from '@components/ui/Avatar';
import { useCall, CALL_STATES } from '@context/CallContext';
import '../pages/call-page.css';

function formatDuration(sec) {
  const m = Math.floor(sec / 60)
    .toString()
    .padStart(2, '0');
  const s = (sec % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
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

  useEffect(() => {
    if (localVideoRef.current) localVideoRef.current.srcObject = localStream;
  }, [localStream]);

  useEffect(() => {
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = remoteStream;
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = remoteStream;
  }, [remoteStream]);

  const isIncoming = status === CALL_STATES.INCOMING;
  const isOutgoing = status === CALL_STATES.OUTGOING;
  const isConnected = status === CALL_STATES.CONNECTED;
  const showVideo = Boolean(peer?.video) && !videoOff;

  return (
    <div className={`call-stage ${className}`.trim()}>
      <div className="call-stage__bg" aria-hidden />
      {/* Always attach remote audio for voice / muted-video calls */}
      <audio
        ref={remoteAudioRef}
        autoPlay
        playsInline
        style={{ position: 'absolute', width: 1, height: 1, opacity: 0, pointerEvents: 'none' }}
      />

      {showVideo ? (
        <div className="call-stage__videos">
          <video
            ref={remoteVideoRef}
            className="call-stage__remote"
            autoPlay
            playsInline
          />
          <video
            ref={localVideoRef}
            className="call-stage__local"
            autoPlay
            playsInline
            muted
          />
        </div>
      ) : (
        <div className="call-stage__avatar-wrap">
          <div className="call-stage__avatar">
            <Avatar src={peer?.avatar} alt={peer?.name} size="lg" />
          </div>
          {(isIncoming || isOutgoing) && <span className="call-stage__pulse" aria-hidden />}
        </div>
      )}

      <div className="call-stage__meta">
        <h2 className="call-stage__name">{peer?.name || 'تماس'}</h2>
        <p className="call-stage__status">
          {isIncoming && 'تماس ورودی...'}
          {isOutgoing && 'در حال تماس...'}
          {isConnected && formatDuration(duration)}
        </p>
        {error ? <p className="call-stage__error">{error}</p> : null}
      </div>

      <div className="call-stage__controls">
        {(isConnected || isOutgoing || isIncoming) && (
          <>
            <button
              type="button"
              className={`call-ctrl ${muted ? 'is-off' : ''}`}
              onClick={toggleMute}
              aria-label={muted ? 'لغو سکوت' : 'سکوت'}
            >
              {muted ? <FiMicOff size={22} /> : <FiMic size={22} />}
            </button>
            {peer?.video ? (
              <button
                type="button"
                className={`call-ctrl ${videoOff ? 'is-off' : ''}`}
                onClick={toggleVideo}
                aria-label={videoOff ? 'روشن کردن ویدیو' : 'خاموش کردن ویدیو'}
              >
                {videoOff ? <FiVideoOff size={22} /> : <FiVideo size={22} />}
              </button>
            ) : null}
          </>
        )}

        {isIncoming ? (
          <>
            <button
              type="button"
              className="call-ctrl call-ctrl--accept"
              onClick={acceptCall}
              aria-label="پذیرش"
            >
              <FiPhone size={24} />
            </button>
            <button
              type="button"
              className="call-ctrl call-ctrl--hang"
              onClick={rejectCall}
              aria-label="رد"
            >
              <FiPhoneOff size={24} />
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
          </button>
        )}
      </div>
    </div>
  );
}
