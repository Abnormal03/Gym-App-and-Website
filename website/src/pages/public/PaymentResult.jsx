import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';
import { CheckCircle2, Clock, XCircle } from 'lucide-react';
import { checkoutApi } from '../../api/checkout.api';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/common/Button';
import { ErrorState, Spinner } from '../../components/common/states';
import Logo from '../../components/layout/Logo';

const POLL_MS = 10000;
const MAX_POLLS = 18; // ~3 minutes, then stop and let the member check My bookings

/**
 * Landing page for Chapa's redirect: /payment-success | /payment-failed | /payment-pending?tx_ref=...
 * The URL only hints at the outcome. The real status always comes from GET /api/payments/verify/:txRef.
 */
export default function PaymentResult() {
  const [params] = useSearchParams();
  const txRef = params.get('tx_ref') || params.get('trx_ref');
  const { isAuthenticated, status } = useAuth();
  const location = useLocation();
  const [state, setState] = useState({ loading: true, result: null, error: null });
  const polls = useRef(0);

  useEffect(() => {
    if (status === 'loading' || !isAuthenticated || !txRef) return undefined;
    let timer;
    let cancelled = false;
    const check = async () => {
      try {
        const result = await checkoutApi.verify(txRef);
        if (cancelled) return;
        setState({ loading: false, result, error: null });
        const done = result.localStatus === 'success' || result.localStatus === 'failed' || result.expired;
        if (!done && ++polls.current < MAX_POLLS) timer = setTimeout(check, POLL_MS);
      } catch (error) {
        if (!cancelled) setState({ loading: false, result: null, error });
      }
    };
    check();
    return () => { cancelled = true; clearTimeout(timer); };
  }, [status, isAuthenticated, txRef]);

  let body;
  if (!txRef) {
    body = <ErrorState title="Missing payment reference" error={{ message: 'The link did not include a transaction reference.' }} />;
  } else if (status === 'loading') {
    body = <Spinner label="Restoring your session" />;
  } else if (!isAuthenticated) {
    body = (
      <div className="card p-8 text-center">
        <h1 className="text-2xl">Sign in to see your payment</h1>
        <p className="mt-1 text-ink-500">We need your account to look up reference {txRef}.</p>
        <Button as={Link} to="/login" state={{ from: location.pathname + location.search }} className="mt-4">Sign in</Button>
      </div>
    );
  } else if (state.loading) {
    body = <Spinner label="Checking your payment" />;
  } else if (state.error) {
    body = <ErrorState error={state.error} title="Could not check the payment" onRetry={() => window.location.reload()} />;
  } else {
    const r = state.result;
    const ok = r.localStatus === 'success';
    const failed = r.localStatus === 'failed' || r.expired;
    const Icon = ok ? CheckCircle2 : failed ? XCircle : Clock;
    const tone = ok ? 'text-brand bg-brand-50' : failed ? 'text-red-600 bg-red-50' : 'text-amber-600 bg-amber-50';
    body = (
      <div className="card p-8 text-center" role="status">
        <span className={`mx-auto flex h-14 w-14 items-center justify-center rounded-full ${tone}`}><Icon className="h-7 w-7" aria-hidden="true" /></span>
        <h1 className="mt-4 text-3xl">{ok ? 'Payment confirmed' : failed ? (r.expired ? 'This order expired' : 'Payment failed') : 'Waiting for confirmation'}</h1>
        <p className="mt-1 text-ink-500">
          {ok ? `Your booking is ${r.bookingStatus || 'confirmed'}.` : failed ? 'Nothing was booked. You can start again from the gym page.' : 'Chapa has not confirmed the payment yet. This page checks every 10 seconds.'}
        </p>
        {r.needsManualRefund && <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">The payment arrived after the order expired. Contact the gym to arrange a refund.</p>}
        <p className="mt-3 text-xs text-ink-400">Reference {txRef}</p>
        <div className="mt-5 flex justify-center gap-2">
          <Button as={Link} to="/app/bookings">View my bookings</Button>
          {failed && <Button as={Link} to="/app/gyms" variant="secondary">Find a gym</Button>}
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-50 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex justify-center"><Logo /></div>
        {body}
      </div>
    </div>
  );
}
