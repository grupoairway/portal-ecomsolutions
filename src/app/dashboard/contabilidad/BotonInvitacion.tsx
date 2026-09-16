'use client';

import { useState } from 'react';
import styles from './contabilidad.module.css';

export default function BotonInvitacion() {
  const [estado, setEstado] = useState<'inicial' | 'enviando' | 'hecho'>('inicial');
  const [error, setError] = useState<string | null>(null);

  async function pedir() {
    setEstado('enviando');
    setError(null);

    try {
      const res = await fetch('/api/quantum/invitacion', { method: 'POST' });
      const datos = await res.json();

      if (!res.ok) {
        // Si ya lo pidió hoy, el mensaje del servidor ya lo explica.
        setError(datos.error ?? 'No hemos podido enviar tu petición.');
        setEstado('inicial');
        return;
      }

      setEstado('hecho');
    } catch {
      setError('No hemos podido conectar. Vuelve a intentarlo.');
      setEstado('inicial');
    }
  }

  if (estado === 'hecho') {
    return <p className={styles.aviso}>Te la reenviaremos en 24 horas.</p>;
  }

  return (
    <>
      <div className="actions">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={pedir}
          disabled={estado === 'enviando'}
        >
          {estado === 'enviando' ? 'Enviando…' : 'Reenviar invitación'}
        </button>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </>
  );
}
