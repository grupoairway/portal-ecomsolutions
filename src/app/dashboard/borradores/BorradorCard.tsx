'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Del módulo puro, no de vencimientos.ts: este componente es de cliente y no
// debe arrastrar el SDK de Notion al navegador.
import {
  calcularPlazoConformidad,
  etiquetaModelo,
  fechaLimitePresentacion,
  FORMA_PAGO_DOMICILIACION,
  type Vencimiento,
} from '@/lib/vencimientos-tipos';
import { euros, fechaHoraLarga, fechaLarga } from '@/lib/fechas';
import Seguimiento from '@/components/Seguimiento';
import BloquePago from './BloquePago';
import styles from './borradores.module.css';

/**
 * Formas de pago que ofrecemos al cliente según el resultado del modelo.
 * Los valores tienen que coincidir exactamente con las opciones del select
 * "Forma pago/cobro" de Notion.
 */
function opcionesPago(resultado: string | null): Array<{
  valor: string;
  etiqueta: string;
  pideIban: boolean;
}> {
  if (resultado === 'A devolver') {
    return [
      {
        valor: 'Devolución en cuenta',
        etiqueta: 'Que me lo devuelvan a mi cuenta',
        pideIban: true,
      },
      {
        valor: 'Compensar próximas',
        etiqueta: 'Compensarlo en las próximas declaraciones',
        pideIban: false,
      },
    ];
  }
  if (resultado === 'A pagar') {
    return [
      {
        valor: FORMA_PAGO_DOMICILIACION,
        etiqueta: 'Domiciliar el pago en mi cuenta',
        pideIban: true,
      },
      { valor: 'NRC', etiqueta: 'Pagar yo desde mi banco', pideIban: false },
      {
        valor: 'Aplazamiento',
        etiqueta: 'Solicitar un aplazamiento',
        pideIban: false,
      },
    ];
  }
  return [];
}

export default function BorradorCard({
  vencimiento,
  ibanCliente,
}: {
  vencimiento: Vencimiento;
  /** IBAN de la ficha del cliente, para no hacérselo teclear otra vez. */
  ibanCliente?: string | null;
}) {
  const router = useRouter();
  const opciones = opcionesPago(vencimiento.resultado);

  const [formaPago, setFormaPago] = useState(
    vencimiento.formaPago ?? opciones[0]?.valor ?? '',
  );
  const [iban, setIban] = useState(vencimiento.iban ?? ibanCliente ?? '');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const yaConforme = Boolean(vencimiento.conformidadFecha);
  const pideIban = opciones.find((o) => o.valor === formaPago)?.pideIban ?? false;

  // Domiciliar adelanta la presentación al día 15, así que también adelanta el
  // plazo de conformidad. Se recalcula en vivo al marcar la opción.
  const domiciliando = formaPago === FORMA_PAGO_DOMICILIACION;
  const limiteSiDomicilia = fechaLimitePresentacion(
    vencimiento.fechaLimite,
    FORMA_PAGO_DOMICILIACION,
  );
  const plazoSiDomicilia = calcularPlazoConformidad(
    vencimiento.fechaPublicacionBorrador,
    vencimiento.fechaLimite,
    FORMA_PAGO_DOMICILIACION,
  );
  const domiciliarAdelanta =
    limiteSiDomicilia != null &&
    vencimiento.fechaLimite != null &&
    limiteSiDomicilia < vencimiento.fechaLimite.slice(0, 10);

  async function darConformidad() {
    setEnviando(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/borradores/${vencimiento.id}/conformidad`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            formaPago: formaPago || undefined,
            iban: pideIban ? iban : undefined,
            comentario: comentario || undefined,
          }),
        },
      );

      const datos = await res.json();
      if (!res.ok) {
        setError(datos.error ?? 'No hemos podido guardar tu conformidad.');
        return;
      }

      router.refresh();
    } catch {
      setError('No hemos podido conectar. Comprueba tu conexión y reinténtalo.');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <section className="panel" id={`v-${vencimiento.id}`}>
      <div className={styles.cabecera}>
        <div>
          <h2 style={{ margin: '0 0 2px', fontSize: 17, fontWeight: 600 }}>
            {etiquetaModelo(vencimiento)} · {vencimiento.periodo}
          </h2>
          <small style={{ color: 'var(--muted)' }}>
            {vencimiento.fechaPublicacionBorrador
              ? `Publicado el ${fechaLarga(vencimiento.fechaPublicacionBorrador)}`
              : 'Borrador disponible'}
            {vencimiento.plazoConformidad
              ? ` · Conformidad antes del ${fechaLarga(vencimiento.plazoConformidad)}`
              : ''}
          </small>

          {vencimiento.importe != null && (
            <>
              <div className="bignum" style={{ marginTop: 12 }}>
                {euros(vencimiento.importe)}
              </div>
              <div style={{ color: 'var(--muted)' }}>
                {vencimiento.resultado ?? 'Resultado'}
                {vencimiento.fechaCargo
                  ? ` · Cargo en tu cuenta el ${fechaLarga(vencimiento.fechaCargo)}`
                  : ''}
              </div>
            </>
          )}
        </div>

        <span className={`chip ${yaConforme ? 'chip-ok' : 'chip-warn'}`}>
          {yaConforme ? 'Conformidad dada' : 'Esperando tu conformidad'}
        </span>
      </div>

      <Seguimiento pasos={vencimiento.pasos} />

      {yaConforme ? (
        <>
          <p className="note" style={{ marginTop: 16 }}>
            Diste tu conformidad el {fechaHoraLarga(vencimiento.conformidadFecha)}.
            {vencimiento.formaPago ? ` Forma de pago: ${vencimiento.formaPago}.` : ''}{' '}
            Lo presentaremos
            {vencimiento.fechaLimitePresentacion
              ? ` antes del ${fechaLarga(vencimiento.fechaLimitePresentacion)}`
              : ' dentro de plazo'}
            {vencimiento.domiciliado && vencimiento.fechaLimite
              ? `, y el cargo en tu cuenta será el ${fechaLarga(vencimiento.fechaLimite)}`
              : ''}
            .
          </p>
          {vencimiento.borradorUrl && (
            <div className="actions" style={{ marginTop: 12 }}>
              <a
                href={vencimiento.borradorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                Ver el borrador
              </a>
            </div>
          )}

          <BloquePago vencimiento={vencimiento} />
        </>
      ) : (
        <>
          {opciones.length > 0 && (
            <fieldset className={styles.opciones}>
              <legend className={styles.legend}>
                {vencimiento.resultado === 'A devolver'
                  ? '¿Cómo quieres que te lo devuelvan?'
                  : '¿Cómo quieres pagarlo?'}
              </legend>
              {opciones.map((o) => (
                <label key={o.valor} className={styles.opcion}>
                  <input
                    type="radio"
                    name={`pago-${vencimiento.id}`}
                    value={o.valor}
                    checked={formaPago === o.valor}
                    onChange={() => setFormaPago(o.valor)}
                  />
                  <span>{o.etiqueta}</span>
                </label>
              ))}

              {domiciliando && domiciliarAdelanta && (
                <p className="note" style={{ marginTop: 10 }}>
                  Al domiciliar el pago tenemos que presentar antes del{' '}
                  {fechaLarga(limiteSiDomicilia)}, no del{' '}
                  {fechaLarga(vencimiento.fechaLimite)}: Hacienda necesita
                  margen para ordenar el cargo.
                  {/* Solo se menciona el plazo si domiciliar lo adelanta de
                      verdad; si el borrador se publicó pronto, no cambia. */}
                  {plazoSiDomicilia && plazoSiDomicilia !== vencimiento.plazoConformidad
                    ? ` Eso adelanta tu conformidad al ${fechaLarga(plazoSiDomicilia)}.`
                    : ''}{' '}
                  El dinero sale de tu cuenta el {fechaLarga(vencimiento.fechaLimite)}.
                </p>
              )}

              {pideIban && (
                <label className={styles.campo}>
                  <span>Cuenta bancaria (IBAN)</span>
                  <input
                    type="text"
                    value={iban}
                    onChange={(e) => setIban(e.target.value)}
                    placeholder="ES00 0000 0000 0000 0000 0000"
                    inputMode="text"
                    autoComplete="off"
                  />
                  {!vencimiento.iban && ibanCliente && iban === ibanCliente && (
                    <small style={{ color: 'var(--muted)' }}>
                      Es la cuenta que tenemos en tu ficha. Cámbiala si quieres
                      usar otra.
                    </small>
                  )}
                </label>
              )}
            </fieldset>
          )}

          <label className={styles.campo}>
            <span>¿Quieres decirnos algo? (opcional)</span>
            <textarea
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
              placeholder="Por ejemplo: falta una factura de septiembre"
            />
          </label>

          {error && <p className={styles.error}>{error}</p>}

          <div className="actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              onClick={darConformidad}
              disabled={enviando}
            >
              {enviando ? 'Guardando…' : 'Dar conformidad'}
            </button>
            <Link href="/dashboard/consultas" className="btn btn-ghost">
              Tengo una duda
            </Link>
            {vencimiento.borradorUrl && (
              <a
                href={vencimiento.borradorUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-ghost"
              >
                Ver el borrador
              </a>
            )}
          </div>

          <p className={styles.aviso}>
            Al dar tu conformidad nos autorizas a presentar este modelo tal y
            como aparece en el borrador. Guardamos la fecha y la hora.
          </p>
        </>
      )}
    </section>
  );
}
