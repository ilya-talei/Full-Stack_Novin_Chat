import { createPortal } from 'react-dom';
import { useCall, CALL_STATES } from '@context/CallContext';
import CallStage from './CallStage';
import '../pages/call-page.css';

/** Full-screen in-call UI so calls work from any route (chat header, banner, etc.). */
export default function ActiveCallOverlay() {
  const { status } = useCall();

  // An incoming call starts as a compact notification. The immersive stage is
  // shown only after answering (or while placing an outgoing call).
  if (status === CALL_STATES.IDLE || status === CALL_STATES.INCOMING) return null;

  return createPortal(
    <div className="call-overlay" role="dialog" aria-modal="true" aria-label="صفحه تماس">
      <CallStage className="call-stage--overlay" />
    </div>,
    document.body
  );
}
