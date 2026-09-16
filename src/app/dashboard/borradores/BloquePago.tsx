'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FORMA_PAGO_NRC,
  limpiarNrc,
  PATRON_NRC,
  type Vencimiento,
} from '@/lib/vencimientos-tipos';
import { euros, fechaHoraLarga, fechaLarga } from '@/lib/fechas';
import styles from './borradores.module.css';

/**
 * Pago del modelo cuando la forma es NRC.
 *
 * - Si el cliente tiene certificado digital, pagamos nosotros: aquí solo se
 *   enseña lo que ya consta (NRC, fecha y justificante).
 * - Si no lo tiene, paga él: le damos la carta de pago y recogemos el NRC que
 *   le devuelve el banco, que es lo que nos permite presentar.
 */
export default function BloquePago({ vencimiento }: { vencimiento: Vencimiento }) {
  const router = useRouter();
  const [nrc, setNrc] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const nrcValido = PATRON_NRC.test(limpiarNrc(nrc));

  // Solo hay algo que contar si se paga con NRC. Con domiciliación el dinero
  // sale solo y el recorrido lo cuenta el paso "Cargo en cuenta".
  if (vencimiento.formaPago !== FORMA_PAGO_NRC && !vencimiento.fechaPago) {
    return null;
  }

  async function enviar() {
    setEnviando(true);
    setError(null);

    try {
      const res = await fetch(`/api/borradores/${vencimiento.id}/pago`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nrc: limpiarNrc(nrc) }),
      });

      const datos = await res.json();
      if (!res.ok) {
        setError(datos.error ?? 'No hemos podido guardar el NRC.');
        return;
      }

      router.refresh();
    } catch {
      setError('No hemos podido conectar. Vuelve a intentarlo.');
    } finally {
      setEnviando(false);
    }
  }

  /* Ya pagado: vale tanto si pagó él como si pagamos nosotros. */
  if (vencimiento.fechaPago) {
    return (
      <div className={styles.pago}>
        <p className="note" style={{ margin: 0 }}>
          Pagado el {fechaHoraLarga(vencimiento.fechaPago)}
          {vencimiento.importe != null ? ` · ${euros(vencimiento.importe)}` : ''}
          {vencimiento.nrc ? '. NRC: ' : '.'}
          {vencimiento.nrc && <code className={styles.nrc}>{vencimiento.nrc}</code>}
        </p>
        {vencimiento.justificantePagoUrl && (
          <div className="actions" style={{ marginTop: 10 }}>
            <a
              href={vencimiento.justificantePagoUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              Descargar el justificante de pago
            </a>
          </div>
        )}
      </div>
    );
  }

  /* Pagamos nosotros: el cliente no tiene que hacer nada. */
  if (!vencimiento.pagaElCliente) {
    return (
      <div className={styles.pago}>
        <p style={{ margin: 0, color: 'var(--muted)', fontSize: 14 }}>
          Del pago nos encargamos nosotros con tu certificado digital. Cuando
          esté hecho verás aquí el NRC y el justificante.
        </p>
      </div>
    );
  }

  /* Paga el cliente, pero primero tiene que dar su conformidad. */
  if (!vencimiento.conformidadFecha) return null;

  return (
    <div className={styles.pago}>
      <h3 className={styles.pagoTitulo}>Ahora te toca pagarlo</h3>
      <p style={{ margin: '0 0 12px', color: 'var(--muted)', fontSize: 14 }}>
        Como no tenemos tu certificado digital, el pago lo haces tú. Descarga la
        carta de pago, págala en tu banco y tráenos el NRC que te devuelva: sin
        él no podemos presentar el modelo
        {vencimiento.fechaLimitePresentacion
          ? `, y hay que presentarlo antes del ${fechaLarga(vencimiento.fechaLimitePresentacion)}`
          : ''}
        .
      </p>

      {vencimiento.cartaPagoUrl ? (
        <div className="actions" style={{ marginBottom: 14 }}>
          <a
            href={vencimiento.cartaPagoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost"
          >
            Descargar la carta de pago
          </a>
        </div>
      ) : (
        <p className={styles.avisoSuave}>
          Estamos preparando tu carta de pago. En cuanto esté la verás aquí.
        </p>
      )}

      <label className={styles.campo}>
        <span>NRC que te ha dado el banco</span>
        <input
          type="text"
          value={nrc}
          onChange={(e) => setNrc(e.target.value)}
          placeholder="22 caracteres entre letras y números"
          autoComplete="off"
          spellCheck={false}
        />
      </label>

      {error && <p className={styles.error}>{error}</p>}

      <div className="actions" style={{ marginTop: 12 }}>
        <button
          type="button"
          className="btn"
          onClick={enviar}
          disabled={enviando || !nrcValido}
        >
          {enviando ? 'Guardando…' : 'Ya lo he pagado'}
        </button>
      </div>
    </div>
  );
}
