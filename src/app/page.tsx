'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? 'Error al enviar el enlace. Inténtalo de nuevo.');
      } else {
        setSuccess(true);
      }
    } catch {
      setError('Error de conexión. Comprueba tu conexión e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'center', marginBottom: '1.5rem' }}>
          <img src="/logo.png" alt="" style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'transparent' }} />
          <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.3rem', fontWeight: 700, color: '#0f172a' }}>
            Ecom<span style={{ color: '#2563eb' }}>Solutions</span>
          </span>
        </div>

        <h1 className={styles.title}>Accede a tu portal</h1>
        <p className={styles.subtitle}>
          Introduce tu email y te enviaremos un enlace de acceso
        </p>

        {success ? (
          <div className={styles.success}>
            ✉️ Revisa tu email, te hemos enviado el enlace de acceso.
          </div>
        ) : (
          <form className={styles.form} onSubmit={handleSubmit}>
            <input
              className={styles.input}
              type="email"
              placeholder="tu@email.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              autoFocus
            />
            {error && <div className={styles.error}>{error}</div>}
            <button className={styles.button} type="submit" disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar enlace de acceso'}
            </button>
          </form>
        )}
      </div>

      <footer className={styles.footer}>
        <a href="mailto:info@ecomsolutions.es">info@ecomsolutions.es</a>
        <a href="tel:+34661959962">+34 661 959 962</a>
      </footer>
    </main>
  );
}
