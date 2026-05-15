'use client';

import { useState } from 'react';
import styles from './consultas.module.css';

interface Consulta {
  id: string;
  asunto: string;
  mensaje: string;
  estado: string;
  fecha: string | null;
  respuesta: string | null;
}

interface Props {
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string;
  consultas: Consulta[];
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

function BadgeEstado({ estado }: { estado: string }) {
  if (estado === 'Respondida') return <span className={styles.badgeRespondida}>Respondida</span>;
  if (estado === 'Nueva') return <span className={styles.badgeNueva}>Pendiente</span>;
  return <span className={styles.badgePendiente}>{estado}</span>;
}

export default function ConsultasClient({ clienteId, clienteNombre, clienteEmail, consultas: initial }: Props) {
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');
  const [consultas, setConsultas] = useState<Consulta[]>(initial);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const canSubmit = asunto.trim().length > 0 && mensaje.trim().length >= 20 && !enviando;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError('');

    try {
      const res = await fetch('/api/consultas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ asunto: asunto.trim(), mensaje: mensaje.trim(), clienteId, clienteNombre, clienteEmail }),
      });

      if (!res.ok) throw new Error('Error al enviar');

      setExito(true);
      setAsunto('');
      setMensaje('');

      // Reload consultas
      const updated = await fetch(`/api/consultas?clienteId=${clienteId}`);
      if (updated.ok) {
        const data = await updated.json() as Consulta[];
        setConsultas(data);
      }
    } catch {
      setError('No se pudo enviar la consulta. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  function toggleRespuesta(id: string) {
    setExpandidos(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <div className={styles.content}>
      <div className={styles.pageHeader}>
        <h1 className={styles.h1}>Consultas</h1>
        <p className={styles.subtitulo}>Envía una consulta a tu gestor</p>
      </div>

      {/* FORMULARIO */}
      <form className={styles.formCard} onSubmit={handleSubmit}>
        <h2 className={styles.sectionTitle}>Nueva consulta</h2>

        {exito && (
          <div className={styles.successMsg}>
            Consulta enviada. Te responderemos en menos de 24h.
          </div>
        )}
        {error && <div className={styles.errorMsg}>{error}</div>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="asunto">Asunto</label>
          <input
            id="asunto"
            type="text"
            className={styles.input}
            value={asunto}
            onChange={e => { setAsunto(e.target.value); setExito(false); }}
            placeholder="Ej: Duda sobre el modelo 303"
            required
          />
        </div>

        <div className={styles.field}>
          <label className={styles.label} htmlFor="mensaje">Mensaje</label>
          <textarea
            id="mensaje"
            className={styles.textarea}
            value={mensaje}
            onChange={e => { setMensaje(e.target.value); setExito(false); }}
            placeholder="Describe tu consulta con el máximo detalle posible... (mínimo 20 caracteres)"
            required
            minLength={20}
          />
        </div>

        <button type="submit" className={styles.btnEnviar} disabled={!canSubmit}>
          {enviando ? 'Enviando...' : 'Enviar consulta'}
        </button>
      </form>

      {/* HISTORIAL */}
      <div className={styles.historialCard}>
        <div className={styles.historialHeader}>
          <h2 className={styles.sectionTitle}>Historial de consultas</h2>
        </div>

        {consultas.length === 0 ? (
          <div className={styles.emptyHistorial}>
            No has enviado ninguna consulta todavía.
          </div>
        ) : (
          consultas.map(c => (
            <div
              key={c.id}
              className={`${styles.consultaItem} ${c.estado === 'Respondida' ? styles.consultaItemRespondida : ''}`}
            >
              <div className={styles.consultaTop}>
                <span className={styles.consultaAsunto}>{c.asunto}</span>
                <BadgeEstado estado={c.estado} />
              </div>
              <div className={styles.consultaMeta}>{formatFecha(c.fecha)}</div>
              <div className={styles.consultaPreview}>
                {c.mensaje.length > 100 ? `${c.mensaje.substring(0, 100)}...` : c.mensaje}
              </div>
              {c.respuesta && (
                <>
                  <button
                    type="button"
                    className={styles.btnVerRespuesta}
                    onClick={() => toggleRespuesta(c.id)}
                  >
                    {expandidos.has(c.id) ? 'Ocultar respuesta' : 'Ver respuesta'}
                  </button>
                  {expandidos.has(c.id) && (
                    <div className={styles.respuestaBox}>
                      <div className={styles.respuestaLabel}>Respuesta del gestor</div>
                      {c.respuesta}
                    </div>
                  )}
                </>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
