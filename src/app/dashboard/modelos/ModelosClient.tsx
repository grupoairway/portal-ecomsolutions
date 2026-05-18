'use client';

import { useState } from 'react';
import type { ModeloVencimiento } from '@/lib/modelos-tipos';
import styles from './modelos.module.css';

type FlowStep = 'idle' | 'iban' | 'motivo';

interface CardState {
  step: FlowStep;
  accion: string;
  ibanValue: string;
  motivoValue: string;
  ibanError: string;
  enviando: boolean;
}

const FORMA_PAGO_LABELS: Record<string, string> = {
  presentar: 'Voluntario',
  domiciliar: 'Domiciliación',
  aplazar: 'Aplazamiento',
  devolucion_cuenta: 'Devolución en cuenta',
  compensar: 'Compensar próximas presentaciones',
};

function validarIBAN(iban: string): boolean {
  return /^ES\d{22}$/.test(iban.replace(/\s/g, '').toUpperCase());
}

function formatImporte(importe: number | null): string {
  if (importe == null) return '';
  return importe.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
}

function ResultadoBadge({ resultado, importe }: { resultado: string | null; importe: number | null }) {
  if (!resultado) return null;
  const cls =
    resultado === 'A pagar' ? styles.resultadoPagar
    : resultado === 'A devolver' ? styles.resultadoDevolver
    : resultado === 'Informativo' ? styles.resultadoInformativo
    : styles.resultadoCero;

  const label =
    (resultado === 'A pagar' || resultado === 'A devolver') && importe != null
      ? `${resultado} ${formatImporte(importe)}`
      : resultado;

  return <span className={`${styles.resultadoBadge} ${cls}`}>{label}</span>;
}

function EstadoBadge({ estado }: { estado: string }) {
  const cls =
    estado === 'Presentado' ? styles.estadoPresentado
    : estado === 'Domiciliado' ? styles.estadoDomiciliado
    : styles.estadoConfirmado;
  const label =
    estado === 'Presentado' ? 'Presentado ✅'
    : estado === 'Domiciliado' ? 'Domiciliado'
    : 'Confirmado ✅';
  return <span className={`${styles.estadoBadge} ${cls}`}>{label}</span>;
}

// ─── Per-card component ───────────────────────────────────────────────────────

interface CardProps {
  modelo: ModeloVencimiento;
  demo?: boolean;
  onConfirmed: (id: string, formaPago: string) => void;
}

function ModeloPendienteCard({ modelo, demo, onConfirmed }: CardProps) {
  const alreadyConfirmed =
    modelo.estado === 'Confirmado' || modelo.confirmacionCliente === 'Confirmado';

  const [confirmed, setConfirmed] = useState(alreadyConfirmed);
  const [confirmedFormaPago, setConfirmedFormaPago] = useState(modelo.formaPago ?? '');
  const [flow, setFlow] = useState<CardState>({
    step: 'idle',
    accion: '',
    ibanValue: '',
    motivoValue: '',
    ibanError: '',
    enviando: false,
  });

  async function confirmar(accion: string, iban?: string, motivo?: string) {
    if (demo) {
      const fp = FORMA_PAGO_LABELS[accion] ?? accion;
      setConfirmed(true);
      setConfirmedFormaPago(fp);
      onConfirmed(modelo.id, fp);
      return;
    }

    setFlow(prev => ({ ...prev, enviando: true }));
    try {
      const res = await fetch(`/api/modelos/${modelo.id}/confirmar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accion, iban, motivo }),
      });
      if (!res.ok) throw new Error('Error al confirmar');
      const fp = FORMA_PAGO_LABELS[accion] ?? accion;
      setConfirmed(true);
      setConfirmedFormaPago(fp);
      onConfirmed(modelo.id, fp);
    } catch {
      setFlow(prev => ({ ...prev, enviando: false }));
      alert('Error al confirmar. Por favor, inténtalo de nuevo o usa el enlace de WhatsApp.');
    }
  }

  function handleAccion(accion: string) {
    if (accion === 'domiciliar' || accion === 'devolucion_cuenta') {
      setFlow(prev => ({ ...prev, step: 'iban', accion, ibanValue: '', ibanError: '' }));
    } else if (accion === 'aplazar') {
      setFlow(prev => ({ ...prev, step: 'motivo', accion, motivoValue: '' }));
    } else {
      confirmar(accion);
    }
  }

  function cancelar() {
    setFlow({ step: 'idle', accion: '', ibanValue: '', motivoValue: '', ibanError: '', enviando: false });
  }

  function handleConfirmarIBAN() {
    if (!validarIBAN(flow.ibanValue)) {
      setFlow(prev => ({ ...prev, ibanError: 'IBAN inválido. Debe empezar por ES y tener 24 caracteres.' }));
      return;
    }
    confirmar(flow.accion, flow.ibanValue.replace(/\s/g, '').toUpperCase());
  }

  const waText = encodeURIComponent(`Quiero confirmar el ${modelo.modelo} ${modelo.periodo}`);
  const resultado = modelo.resultadoModelo;

  if (confirmed) {
    return (
      <div className={styles.confirmedCard}>
        <div className={styles.cardHeader}>
          <div className={styles.cardHeaderLeft}>
            <span className={styles.modeloBadge}>{modelo.modelo}</span>
            <span className={styles.periodoText}>{modelo.periodo}</span>
            {modelo.fechaLimite && (
              <span className={styles.fechaLimite}>· Límite: {formatFecha(modelo.fechaLimite)}</span>
            )}
          </div>
          <div className={styles.cardHeaderRight}>
            <ResultadoBadge resultado={resultado} importe={modelo.importeAIngresar} />
          </div>
        </div>
        <div>
          <span className={styles.confirmedBadge}>Confirmado ✅</span>
          {confirmedFormaPago && (
            <p className={styles.confirmedFormaPago}>Forma de pago: {confirmedFormaPago}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.pendienteCard}>
      {/* Header */}
      <div className={styles.cardHeader}>
        <div className={styles.cardHeaderLeft}>
          <span className={styles.modeloBadge}>{modelo.modelo}</span>
          <span className={styles.periodoText}>{modelo.periodo}</span>
          {modelo.fechaLimite && (
            <span className={styles.fechaLimite}>· Límite: {formatFecha(modelo.fechaLimite)}</span>
          )}
        </div>
        <div className={styles.cardHeaderRight}>
          <ResultadoBadge resultado={resultado} importe={modelo.importeAIngresar} />
          {modelo.borradorUrl && (
            <a
              href={modelo.borradorUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.btnBorrador}
            >
              📄 Ver borrador
            </a>
          )}
        </div>
      </div>

      {/* Actions */}
      <div>
        <div className={styles.actionButtons}>
          {resultado === 'A pagar' && (
            <>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnPrimary}`}
                onClick={() => handleAccion('presentar')}
                disabled={flow.enviando}
              >
                ✅ Confirmar presentación
              </button>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnSecondary}`}
                onClick={() => handleAccion('domiciliar')}
                disabled={flow.enviando}
              >
                🏦 Domiciliar pago
              </button>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnWarning}`}
                onClick={() => handleAccion('aplazar')}
                disabled={flow.enviando}
              >
                ⏳ Solicitar aplazamiento
              </button>
            </>
          )}

          {resultado === 'A devolver' && (
            <>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnSuccess}`}
                onClick={() => handleAccion('devolucion_cuenta')}
                disabled={flow.enviando}
              >
                ✅ Confirmar y solicitar devolución
              </button>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnSecondary}`}
                onClick={() => handleAccion('compensar')}
                disabled={flow.enviando}
              >
                🔄 Compensar en próximas declaraciones
              </button>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnWarning}`}
                onClick={() => handleAccion('aplazar')}
                disabled={flow.enviando}
              >
                ⏳ Solicitar aplazamiento
              </button>
            </>
          )}

          {(resultado === 'Cero' || resultado === 'Informativo' || resultado == null) && (
            <button
              type="button"
              className={`${styles.btnAction} ${styles.btnPrimary}`}
              onClick={() => handleAccion('presentar')}
              disabled={flow.enviando}
            >
              ✅ Confirmar presentación
            </button>
          )}
        </div>

        {/* IBAN input */}
        {flow.step === 'iban' && (
          <div className={styles.ibanSection}>
            <label htmlFor={`iban-${modelo.id}`}>Introduce tu IBAN</label>
            <input
              id={`iban-${modelo.id}`}
              type="text"
              className={`${styles.ibanInput}${flow.ibanError ? ' ' + styles.ibanInputError : ''}`}
              value={flow.ibanValue}
              onChange={(e) =>
                setFlow(prev => ({ ...prev, ibanValue: e.target.value.toUpperCase(), ibanError: '' }))
              }
              placeholder="ES00 0000 0000 0000 0000 0000"
              maxLength={29}
            />
            {flow.ibanError && <span className={styles.inputError}>{flow.ibanError}</span>}
            <div className={styles.inputActions}>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnPrimary}`}
                onClick={handleConfirmarIBAN}
                disabled={flow.enviando}
              >
                {flow.enviando ? 'Confirmando…' : 'Confirmar con este IBAN'}
              </button>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnSecondary}`}
                onClick={cancelar}
                disabled={flow.enviando}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Motivo textarea */}
        {flow.step === 'motivo' && (
          <div className={styles.motivoSection}>
            <label htmlFor={`motivo-${modelo.id}`}>Motivo del aplazamiento (opcional)</label>
            <textarea
              id={`motivo-${modelo.id}`}
              className={styles.motivoTextarea}
              value={flow.motivoValue}
              onChange={(e) =>
                setFlow(prev => ({ ...prev, motivoValue: e.target.value }))
              }
              placeholder="Indica el motivo de tu solicitud de aplazamiento..."
            />
            <div className={styles.inputActions}>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnWarning}`}
                onClick={() => confirmar(flow.accion, undefined, flow.motivoValue)}
                disabled={flow.enviando}
              >
                {flow.enviando ? 'Enviando…' : '⏳ Solicitar aplazamiento'}
              </button>
              <button
                type="button"
                className={`${styles.btnAction} ${styles.btnSecondary}`}
                onClick={cancelar}
                disabled={flow.enviando}
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* WhatsApp fallback */}
        <p className={styles.waFallback}>
          ¿Prefieres confirmar por otro canal?{' '}
          <a
            href={`https://wa.me/34661959962?text=${waText}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.waLink}
          >
            💬 Escríbenos por WhatsApp
          </a>
          {' '}o responde al email que te enviamos.
        </p>
      </div>
    </div>
  );
}

// ─── Main client component ────────────────────────────────────────────────────

interface Props {
  pendientes: ModeloVencimiento[];
  historial: ModeloVencimiento[];
  demo?: boolean;
}

export default function ModelosClient({ pendientes: initialPendientes, historial, demo }: Props) {
  const [pendientes, setPendientes] = useState<ModeloVencimiento[]>(initialPendientes);

  function handleConfirmed(id: string, formaPago: string) {
    setPendientes(prev =>
      prev.map(m =>
        m.id === id
          ? { ...m, estado: 'Confirmado', confirmacionCliente: 'Confirmado', formaPago }
          : m,
      ),
    );
  }

  return (
    <>
      {/* Pendientes */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Pendientes de confirmar</h2>
        {pendientes.length === 0 ? (
          <p className={styles.emptyMessage}>No tienes modelos pendientes de confirmar. ✅</p>
        ) : (
          pendientes.map(modelo => (
            <ModeloPendienteCard
              key={modelo.id}
              modelo={modelo}
              demo={demo}
              onConfirmed={handleConfirmed}
            />
          ))
        )}
      </div>

      {/* Historial */}
      {historial.length > 0 && (
        <div className={styles.section}>
          <h2 className={styles.sectionTitle}>Historial</h2>
          <div className={styles.historialList}>
            {historial.map(modelo => (
              <div key={modelo.id} className={styles.historialItem}>
                <div className={styles.historialLeft}>
                  <span className={styles.modeloBadge}>{modelo.modelo}</span>
                  <div className={styles.historialInfo}>
                    <div className={styles.historialNombre}>
                      {modelo.nombre || `Modelo ${modelo.modelo} · ${modelo.periodo}`}
                    </div>
                    <div className={styles.historialMeta}>
                      {modelo.periodo}
                      {modelo.fechaLimite ? ` · ${formatFecha(modelo.fechaLimite)}` : ''}
                    </div>
                  </div>
                </div>
                <div className={styles.historialRight}>
                  <ResultadoBadge resultado={modelo.resultadoModelo} importe={modelo.importeAIngresar} />
                  <EstadoBadge estado={modelo.estado} />
                  {modelo.borradorUrl && (
                    <a
                      href={modelo.borradorUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.btnBorrador}
                    >
                      Descargar
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
