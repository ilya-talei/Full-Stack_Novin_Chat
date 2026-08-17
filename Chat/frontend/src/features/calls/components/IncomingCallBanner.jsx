import { useState } from 'react';
import { FiPhone, FiPhoneOff } from 'react-icons/fi';
import Avatar from '@components/ui/Avatar';
import { useCall, CALL_STATES } from '@context/CallContext';
import '../pages/call-page.css';

/** Compact notification shown before an incoming call is accepted. */
export default function IncomingCallBanner() {
  const { status, peer, acceptCall, rejectCall } = useCall();
  const [accepting, setAccepting] = useState(false);

  if (status !== CALL_STATES.INCOMING || !peer) return null;

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    try {
      await acceptCall();
    } finally {
      setAccepting(false);
    }
  };

  return (
    <div
      className="call-banner"
      role="alertdialog"
      aria-modal="false"
      aria-label={`تماس ورودی از ${peer.name}`}
    >
      <Avatar src={peer.avatar} alt={peer.name} size="md" />
      <div className="call-banner__meta">
        <span className="call-banner__name">{peer.name}</span>
        <span className="call-banner__sub">
          {accepting
            ? 'در حال اتصال...'
            : peer.cameraPreferred
              ? 'تماس تصویری ورودی'
              : 'تماس صوتی ورودی'}
        </span>
      </div>
      <div className="call-banner__actions">
        <button
          type="button"
          className="call-banner__btn call-banner__btn--ok"
          onClick={handleAccept}
          disabled={accepting}
          aria-label="پذیرش"
        >
          <FiPhone size={18} />
        </button>
        <button
          type="button"
          className="call-banner__btn call-banner__btn--no"
          onClick={rejectCall}
          disabled={accepting}
          aria-label="رد"
        >
          <FiPhoneOff size={18} />
        </button>
      </div>
    </div>
  );
}
