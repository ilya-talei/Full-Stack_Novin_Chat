import { FiPhone, FiPhoneOff } from 'react-icons/fi';
import Avatar from '@components/ui/Avatar';
import { useCall, CALL_STATES } from '@context/CallContext';
import { useLocation } from 'react-router-dom';
import { ROUTES } from '@constants/routes';
import './call-page.css';

/** Floating incoming-call bar when user is not already on the call screen. */
export default function IncomingCallBanner() {
  const { status, peer, acceptCall, rejectCall } = useCall();
  const location = useLocation();

  if (status !== CALL_STATES.INCOMING || !peer) return null;
  if (location.pathname === ROUTES.CALL) return null;

  return (
    <div className="call-banner" role="alertdialog" aria-label="تماس ورودی">
      <Avatar src={peer.avatar} alt={peer.name} size="md" />
      <div className="call-banner__meta">
        <span className="call-banner__name">{peer.name}</span>
        <span className="call-banner__sub">
          {peer.video ? 'تماس ویدیویی ورودی' : 'تماس صوتی ورودی'}
        </span>
      </div>
      <div className="call-banner__actions">
        <button
          type="button"
          className="call-banner__btn call-banner__btn--ok"
          onClick={acceptCall}
          aria-label="پذیرش"
        >
          <FiPhone size={18} />
        </button>
        <button
          type="button"
          className="call-banner__btn call-banner__btn--no"
          onClick={rejectCall}
          aria-label="رد"
        >
          <FiPhoneOff size={18} />
        </button>
      </div>
    </div>
  );
}
