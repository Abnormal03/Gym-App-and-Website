import { useState } from 'react';
import { Check, Copy } from 'lucide-react';
import Modal from './Modal';
import Button from './Button';

/** Shows a server-generated temporary password. The API returns it only once. */
export default function TempPasswordDialog({ open, name, password, onClose }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard unavailable: the password is still visible */
    }
  };
  return (
    <Modal open={open} onClose={onClose} title="Temporary password" size="sm" footer={<Button onClick={onClose}>Done</Button>}>
      <p className="text-ink-600">Share this password with {name || 'the user'}. It is shown only once, and they must change it at first sign-in.</p>
      <div className="mt-4 flex items-center justify-between gap-3 rounded-md border border-ink-200 bg-ink-50 px-4 py-3">
        <code className="break-all font-mono text-lg">{password}</code>
        <Button variant="secondary" size="sm" icon={copied ? Check : Copy} onClick={copy}>{copied ? 'Copied' : 'Copy'}</Button>
      </div>
    </Modal>
  );
}
