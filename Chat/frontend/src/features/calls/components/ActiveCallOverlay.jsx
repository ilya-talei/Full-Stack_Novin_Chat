import { createPortal } from 'react-dom';
import { useCall, CALL_STATES } from '@context/CallContext';
import CallStage from './CallStage';
import '../pages/call-page.css';

/** Full-screen in-call UI so calls work from any route (chat header, banner, etc.). */
export default function ActiveCallOverlay() {
  const { status } = useCall();

  if (status === CALL_STATES.IDLE) return null;

  return createPortal(
    <div className="call-overlay" role="dialog" aria-modal="true" aria-label="صفحه تماس">
      <CallStage className="call-stage--overlay" />
    </div>,
    document.body
  );
}
