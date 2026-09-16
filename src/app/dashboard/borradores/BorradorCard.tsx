'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// Del módulo puro, no de vencimientos.ts: este componente es de cliente y no
// debe arrastrar el SDK de Notion al navegador.
import {
  avisoInformativo,
  AVISO_GARANTIA,
  AYUDA_APLAZAMIENTO,
  AYUDA_DEVOLVER_O_COMPENSAR,
  calcularPlazoConformidad,
  destinoNegativo,
  etiquetaModelo,
  fechaLimitePresentacion,
  FORMA_PAGO_APLAZAMIENTO,
  FORMA_PAGO_DOMICILIACION,
  importeConSigno,
  maxCuotas,
  mesesPrimeraCuota,
  opcionesFormaPago,
  requiereGarantia,
  requiereRevision,
  sinImporteDestacado,
  TEXTO_REVISION,
  textoResultado,
  validarAplazamiento,
  type Vencimiento,
} from '@/lib/vencimientos-tipos';
import { nombreMes } from '@/lib/cierres-tipos';
import { euros, fechaHoraLarga, fechaLarga } from '@/lib/fechas';
import Seguimiento from '@/components/Seguimiento';
import BloquePago from './BloquePago';
import styles from './borradores.module.css';

export default function BorradorCard({
  vencimiento,
  ibanCliente,
}: {
  vencimiento: Vencimiento;
  /** IBAN de la ficha del cliente, para no hacérselo teclear otra vez. */
  ibanCliente?: string | null;
}) {
  const router = useRouter();
  const opciones = opcionesFormaPago(vencimiento);
  // Lo que conviene revisar en esta declaración concreta, si es de las que
  // Hacienda cruza con datos de terceros.
  const avisoModelo = avisoInformativo(vencimiento);

  const [formaPago, setFormaPago] = useState(
    vencimiento.formaPago ?? opciones[0]?.valor ?? '',
  );
  const [iban, setIban] = useState(vencimiento.iban ?? ibanCliente ?? '');
  const [comentario, setComentario] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Aplazamiento: el tope de cuotas depende de la forma jurídica del cliente.
  const tope = maxCuotas(vencimiento.tipoCliente);
  const opcionesCuotas = Array.from({ length: tope - 1 }, (_, i) => i + 2);
  const mesesDisponibles = mesesPrimeraCuota();
  const [cuotas, setCuotas] = useState(Math.min(3, tope));
  const [primeraCuota, setPrimeraCuota] = useState(mesesDisponibles[0]);
  const [motivo, setMotivo] = useState('');

  // Informativas y modelos a cero.
  const [revisado, setRevisado] = useState(false);

  const yaConforme = Boolean(vencimiento.conformidadFecha);
  const opcionElegida = opciones.find((o) => o.valor === formaPago);
  const pideIban = opcionElegida?.pideIban ?? false;
  const avisoOpcion = opcionElegida?.aviso;
  const aplazando = formaPago === FORMA_PAGO_APLAZAMIENTO;
  const necesitaGarantia = requiereGarantia(vencimiento);

  /*
   * El botón se apaga cuando falta algo obligatorio. La comprobación del
   * aplazamiento es la misma función que usa el endpoint, así que la pantalla
   * no puede permitir enviar algo que el servidor va a rechazar.
   */
  const errorAplazamiento = aplazando
    ? validarAplazamiento(vencimiento, { cuotas, primeraCuota, motivo })
    : null;
  const faltaRevisar = requiereRevision(vencimiento) && !revisado;
  const puedeEnviar = !faltaRevisar && errorAplazamiento === null;

  /*
   * Lo que se le recuerda después de dar la conformidad. "Forma de pago:
   * Compensar próximas" no le dice nada a nadie: si el modelo sale a su
   * favor, se le cuenta qué va a pasar con ese dinero.
   */
  const notaDecision = vencimiento.esNegativo
    ? destinoNegativo(vencimiento) === 'devolver'
      ? ' Pediremos a Hacienda que te lo ingrese en tu cuenta.'
      : ' El saldo se compensará en tus próximas declaraciones.'
    : vencimiento.formaPago === FORMA_PAGO_APLAZAMIENTO
      ? ` Pediremos el aplazamiento en ${vencimiento.aplazamientoCuotas ?? ''} cuotas${
          vencimiento.aplazamientoPrimeraCuota
            ? `, desde ${nombreMes(vencimiento.aplazamientoPrimeraCuota.slice(0, 7))}`
            : ''
        }. La respuesta la da Hacienda.`
      : vencimiento.formaPago
        ? ` Forma de pago: ${vencimiento.formaPago}.`
        : '';

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
            revisado: requiereRevision(vencimiento) ? revisado : undefined,
            ...(aplazando ? { cuotas, primeraCuota, motivo } : {}),
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

          {/* Una informativa o un modelo a cero no llevan importe a tamaño
              titular: no hay ninguna cifra que el cliente deba mirar. */}
          {!sinImporteDestacado(vencimiento) && vencimiento.importe != null && (
            <div className="bignum" style={{ marginTop: 12 }}>
              {euros(importeConSigno(vencimiento))}
            </div>
          )}

          <div style={{ color: 'var(--muted)', marginTop: 6 }}>
            {textoResultado(vencimiento)}
            {/* El cargo solo se anuncia cuando el dinero sale de su cuenta;
                si el modelo sale a su favor, no hay cargo. */}
            {!vencimiento.esNegativo && vencimiento.fechaCargo
              ? ` · Cargo en tu cuenta el ${fechaLarga(vencimiento.fechaCargo)}`
              : ''}
          </div>

          {avisoModelo && (
            <p className="note" style={{ marginTop: 10 }}>
              {avisoModelo}
            </p>
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
            {notaDecision}{' '}
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
                {!vencimiento.esNegativo
                  ? '¿Cómo quieres pagarlo?'
                  : opciones.length === 1
                    ? '¿Dónde quieres que te lo ingresen?'
                    : '¿Qué prefieres hacer con el saldo a tu favor?'}
              </legend>

              {/* Elegir entre devolución y compensación tiene consecuencias
                  que el cliente no tiene por qué conocer: se le cuentan. */}
              {vencimiento.esNegativo && opciones.length > 1 && (
                <p className="note" style={{ margin: '0 0 10px' }}>
                  {AYUDA_DEVOLVER_O_COMPENSAR}
                </p>
              )}

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

              {/* Lo que hay que saber de la opción marcada, sea cual sea. */}
              {avisoOpcion && (
                <p className="note" style={{ marginTop: 10 }}>
                  {avisoOpcion}
                </p>
              )}

              {/* Por encima del límite sin garantía no hay formulario que
                  valga: hace falta un aval y eso se habla con el gestor. */}
              {aplazando && necesitaGarantia && (
                <>
                  <p className="note" style={{ marginTop: 10 }}>
                    {AVISO_GARANTIA}.
                  </p>
                  <div className="actions" style={{ marginTop: 10 }}>
                    <Link href="/dashboard/consultas" className="btn">
                      Escribirnos
                    </Link>
                  </div>
                </>
              )}

              {aplazando && !necesitaGarantia && (
                <>
                  <p className="note" style={{ marginTop: 10 }}>
                    {AYUDA_APLAZAMIENTO}
                  </p>

                  <label className={styles.campo}>
                    <span>¿En cuántas cuotas?</span>
                    <select
                      value={cuotas}
                      onChange={(e) => setCuotas(Number(e.target.value))}
                    >
                      {opcionesCuotas.map((n) => (
                        <option key={n} value={n}>
                          {n} cuotas
                        </option>
                      ))}
                    </select>
                    {/* El límite va redondo, como cifra de referencia: no es
                        un importe que haya que cuadrar con nada. */}
                    <small style={{ color: 'var(--muted)' }}>
                      Máximo sin garantía para tu tipo de actividad: {tope}{' '}
                      cuotas, si tu deuda total con Hacienda no supera 50.000 €.
                    </small>
                  </label>

                  <label className={styles.campo}>
                    <span>¿Cuándo quieres pagar la primera?</span>
                    <select
                      value={primeraCuota}
                      onChange={(e) => setPrimeraCuota(e.target.value)}
                    >
                      {mesesDisponibles.map((mes) => (
                        <option key={mes} value={mes}>
                          {nombreMes(mes)}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className={styles.campo}>
                    <span>¿Por qué necesitas aplazarlo?</span>
                    <textarea
                      value={motivo}
                      onChange={(e) => setMotivo(e.target.value)}
                      placeholder="Por ejemplo: un cliente importante me ha pagado con dos meses de retraso"
                    />
                    <small style={{ color: 'var(--muted)' }}>
                      Hacienda necesita el motivo para estudiar la solicitud.
                    </small>
                  </label>
                </>
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

          {/* Informativas y modelos a cero: nada que elegir, pero sí que
              revisar. La casilla es lo que sostiene la conformidad. */}
          {requiereRevision(vencimiento) && (
            <div className="checks" style={{ marginBottom: 14 }}>
              <label>
                <input
                  type="checkbox"
                  checked={revisado}
                  onChange={(e) => setRevisado(e.target.checked)}
                />
                {TEXTO_REVISION}
              </label>
            </div>
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
              disabled={enviando || !puedeEnviar}
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
