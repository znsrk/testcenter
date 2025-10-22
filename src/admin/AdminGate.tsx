import React, { useState } from 'react';
import { isAdmin, setAdmin, ADMIN_ACCESS_CODE } from '../lib/adminSession';

type Props = {
  children: React.ReactNode;
};

export default function AdminGate({ children }: Props) {
  const [ok, setOk] = useState(isAdmin());
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ADMIN_ACCESS_CODE) {
      setError('Missing VITE_ADMIN_ACCESS_CODE in environment.');
      return;
    }
    if (code === ADMIN_ACCESS_CODE) {
      setAdmin(true);
      setOk(true);
    } else {
      setError('Incorrect access code.');
    }
  };

  if (ok) return <>{children}</>;

  return (
    <div style={{ maxWidth: 360, margin: '64px auto', padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
      <h2 style={{ marginTop: 0 }}>Admin Access</h2>
      <form onSubmit={onSubmit}>
        <label style={{ display: 'block', marginBottom: 8 }}>
          Access code
          <input
            type="password"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Enter code"
            style={{ display: 'block', width: '100%', marginTop: 6 }}
          />
        </label>
        {error && <div style={{ color: 'crimson', marginBottom: 8 }}>{error}</div>}
        <button type="submit">Enter</button>
      </form>
    </div>
  );
}