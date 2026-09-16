'use client';

import { useState } from 'react';
import { fechaCorta } from '@/lib/fechas';
import Chip, { type TonoChip } from '@/components/Chip';
import styles from './consultas.module.css';

interface Consulta {
  id: string;
  asunto: string;
  mensaje: string;
  estado: string;
  fecha: string | null;
  respuesta: string | null;
  urgente?: boolean;
}

interface Props {
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string;
  consultas: Consulta[];
}

function tonoEstado(estado: string): TonoChip {
  if (estado === 'Respondida') return 'ok';
  if (estado === 'Cerrada') return 'neutral';
  return 'warn';
}

function textoEstado(estado: string): string {
  return estado === 'Nueva' ? 'Pendiente' : estado;
}

export default function ConsultasClient({
  clienteId,
  clienteNombre,
  clienteEmail,
  consultas: initial,
}: Props) {
  const [asunto, setAsunto] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [urgente, setUrgente] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState('');
  const [consultas, setConsultas] = useState<Consulta[]>(initial);
  const [expandidos, setExpandidos] = useState<Set<string>>(new Set());

  const canSubmit =
    asunto.trim().length > 0 && mensaje.trim().length >= 20 && !enviando;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setError('');

    try {
      const res = await fetch('/api/consultas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          asunto: asunto.trim(),
          mensaje: mensaje.trim(),
          clienteId,
          clienteNombre,
          clienteEmail,
          urgente,
        }),
      });

      if (!res.ok) throw new Error('Error al enviar');

      setExito(true);
      setAsunto('');
      setMensaje('');
      setUrgente(false);

      const updated = await fetch(`/api/consultas?clienteId=${clienteId}`);
      if (updated.ok) {
        setConsultas((await updated.json()) as Consulta[]);
      }
    } catch {
      setError('No se pudo enviar la consulta. Inténtalo de nuevo.');
    } finally {
      setEnviando(false);
    }
  }

  function toggleRespuesta(id: string) {
    setExpandidos((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  return (
    <>
      <h1 className="page-title">Consultas</h1>
      <p className="lead">
        Respondemos en un máximo de 48 horas laborables. Si es urgente, márcalo.
      </p>

      {/* NUEVA CONSULTA */}
      <form className="panel" onSubmit={handleSubmit}>
        <h2 className="panel-title">Nueva consulta</h2>

        {exito && (
          <p className={styles.exito}>
            Consulta enviada. Te responderemos en 48 horas laborables.
          </p>
        )}
        {error && <p className={styles.error}>{error}</p>}

        <label className={styles.campo} htmlFor="asunto">
          <span>Asunto</span>
          <input
            id="asunto"
            type="text"
            value={asunto}
            onChange={(e) => {
              setAsunto(e.target.value);
              setExito(false);
            }}
            placeholder="Por ejemplo: duda sobre el modelo 303"
            required
          />
        </label>

        <label className={styles.campo} htmlFor="mensaje">
          <span>Escribe tu pregunta</span>
          <textarea
            id="mensaje"
            value={mensaje}
            onChange={(e) => {
              setMensaje(e.target.value);
              setExito(false);
            }}
            placeholder="Por ejemplo: ¿puedo deducirme el portátil que he comprado?"
            required
            minLength={20}
          />
        </label>

        <div className="actions" style={{ marginTop: 10, alignItems: 'center' }}>
          <label className={styles.urgente}>
            <input
              type="checkbox"
              checked={urgente}
              onChange={(e) => setUrgente(e.target.checked)}
            />
            <span>Es urgente</span>
          </label>
          <button type="submit" className="btn" disabled={!canSubmit}>
            {enviando ? 'Enviando…' : 'Enviar consulta'}
          </button>
        </div>
      </form>

      {/* TUS CONSULTAS */}
      <section className="panel">
        <h2 className="panel-title">Tus consultas</h2>

        {consultas.length === 0 ? (
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            No has enviado ninguna consulta todavía.
          </p>
        ) : (
          consultas.map((c) => (
            <div className="row" key={c.id} style={{ alignItems: 'flex-start' }}>
              <div>
                {c.asunto}
                <small>
                  {c.fecha ? fechaCorta(c.fecha) : ''}
                  {c.urgente ? ' · urgente' : ''}
                  {c.mensaje ? ` · ${c.mensaje.slice(0, 90)}${c.mensaje.length > 90 ? '…' : ''}` : ''}
                </small>
                {c.respuesta && (
                  <>
                    <button
                      type="button"
                      className={styles.verRespuesta}
                      onClick={() => toggleRespuesta(c.id)}
                    >
                      {expandidos.has(c.id) ? 'Ocultar respuesta' : 'Ver respuesta'}
                    </button>
                    {expandidos.has(c.id) && (
                      <div className={styles.respuesta}>{c.respuesta}</div>
                    )}
                  </>
                )}
              </div>
              <Chip tono={tonoEstado(c.estado)}>{textoEstado(c.estado)}</Chip>
            </div>
          ))
        )}
      </section>
    </>
  );
}
