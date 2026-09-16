'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Chip from './Chip';
import {
  estadoTarjeta,
  mesEnFrase,
  mesesPendientes,
  mesesTarjetas,
  nombreMes,
  plazoCierre,
  type Cierre,
} from '@/lib/cierres-tipos';
import { fechaHoraLarga, fechaLarga, hoy } from '@/lib/fechas';
import styles from './CierreMensual.module.css';

/**
 * Las cuatro cosas que el cliente tiene que haber hecho antes de que podamos
 * contabilizar el mes. Son obligatorias: el botón no se activa hasta que las
 * marca todas, porque confirmar a medias nos haría perder el tiempo a los dos.
 */
const CASILLAS = [
  'He subido o emitido en Quantum todas mis facturas de venta',
  'He subido todas las facturas de gastos y tickets',
  'He subido el extracto bancario del mes',
  'Te he avisado de cualquier cambio en mi actividad (o no ha habido)',
];

interface Props {
  cierres: Cierre[];
  /** Enlace a Quantum, donde se suben las facturas. */
  quantumUrl: string | null;
}

export default function CierreMensual({ cierres, quantumUrl }: Props) {
  const router = useRouter();
  const [marcadas, setMarcadas] = useState<boolean[]>(CASILLAS.map(() => false));
  const [observaciones, setObservaciones] = useState('');
  const [enviando, setEnviando] = useState<'confirmar' | 'sin-movimientos' | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const porMes = new Map(cierres.map((c) => [c.mes, c]));
  const tarjetas = mesesTarjetas();
  const pendientes = mesesPendientes(cierres);

  // A caballo entre dos años ("Diciembre" y "Enero" juntos) el mes solo no
  // basta: ahí las tarjetas llevan el año.
  const variosAnios = new Set(tarjetas.map((m) => m.slice(0, 4))).size > 1;

  // Siempre el más antiguo: si hay atrasos, se ponen al día por orden.
  const mesActivo = pendientes[0] ?? null;
  const todasMarcadas = marcadas.every(Boolean);

  async function enviar(tipo: 'Confirmado' | 'Sin movimientos') {
    if (!mesActivo) return;
    setEnviando(tipo === 'Confirmado' ? 'confirmar' : 'sin-movimientos');
    setError(null);

    try {
      const res = await fetch('/api/cierres', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mes: mesActivo,
          tipo,
          // "Sin movimientos" no arrastra las casillas: no ha habido nada que
          // subir, así que las observaciones son lo único que tiene sentido.
          observaciones: observaciones.trim() || undefined,
        }),
      });

      const datos = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(datos.error ?? 'No hemos podido guardar tu confirmación.');
        return;
      }

      // Al refrescar, el panel pasa solo al siguiente mes pendiente.
      setMarcadas(CASILLAS.map(() => false));
      setObservaciones('');
      router.refresh();
    } catch {
      setError('No hemos podido conectar. Vuelve a intentarlo.');
    } finally {
      setEnviando(null);
    }
  }

  // Lo último que confirmó el cliente: es su prueba de que lo hizo.
  const ultimoConfirmado = [...cierres]
    .filter((c) => c.fechaConfirmacion)
    .sort((a, b) => a.mes.localeCompare(b.mes))
    .pop();

  const plazo = mesActivo ? plazoCierre(mesActivo) : null;
  const fueraDePlazo = plazo != null && plazo < hoy();

  return (
    <>
      <section className="panel">
        <h2 className="panel-title">Documentación mensual</h2>
        <p className={styles.intro}>
          Las facturas y tickets se suben en Quantum. Aquí ves qué meses están
          completos y cuáles nos faltan.
        </p>

        <div className="months">
          {tarjetas.map((mes) => {
            const estado = estadoTarjeta(porMes.get(mes), mes);
            return (
              <div className="month" key={mes}>
                <b>{variosAnios ? nombreMes(mes) : nombreMes(mes).split(' ')[0]}</b>
                <Chip tono={estado.tono}>{estado.texto}</Chip>
              </div>
            );
          })}
        </div>

        <div className="actions" style={{ marginTop: 16 }}>
          {quantumUrl ? (
            <a
              href={quantumUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost"
            >
              Subir facturas en Quantum
            </a>
          ) : (
            <Link href="/dashboard/contabilidad" className="btn btn-ghost">
              Subir facturas en Quantum
            </Link>
          )}
        </div>
      </section>

      {mesActivo ? (
        <section className="panel panel-todo">
          <h2 className="panel-title">
            Confirma la documentación de {mesEnFrase(mesActivo)}
          </h2>

          {pendientes.length > 1 && (
            <p className={styles.aviso}>
              Tienes {pendientes.length} meses sin confirmar. Empezamos por el
              más antiguo: cuando confirmes {mesEnFrase(mesActivo)}, pasarás
              al siguiente.
            </p>
          )}

          <p className={styles.intro}>
            Cuando lo hayas subido todo a Quantum, márcalo aquí. Así sabemos que
            podemos empezar a contabilizar el mes.{' '}
            {plazo && (
              <strong className={fueraDePlazo ? styles.vencido : undefined}>
                {fueraDePlazo
                  ? `El plazo venció el ${fechaLarga(plazo)}.`
                  : `Tienes hasta el ${fechaLarga(plazo)}.`}
              </strong>
            )}
          </p>

          <div className="checks">
            {CASILLAS.map((texto, i) => (
              <label key={texto}>
                <input
                  type="checkbox"
                  checked={marcadas[i]}
                  onChange={(e) =>
                    setMarcadas((prev) =>
                      prev.map((v, j) => (j === i ? e.target.checked : v)),
                    )
                  }
                />
                {texto}
              </label>
            ))}
          </div>

          <label className={styles.etiqueta} htmlFor="observaciones-cierre">
            ¿Algo que debamos saber? (opcional)
          </label>
          <textarea
            id="observaciones-cierre"
            className={styles.textarea}
            value={observaciones}
            onChange={(e) => setObservaciones(e.target.value)}
            maxLength={2000}
            placeholder="Por ejemplo: la factura del proveedor X llegará la semana que viene"
          />

          {error && <p className={styles.error}>{error}</p>}

          <div className="actions" style={{ marginTop: 12 }}>
            <button
              type="button"
              className="btn"
              disabled={!todasMarcadas || enviando !== null}
              onClick={() => enviar('Confirmado')}
            >
              {enviando === 'confirmar'
                ? 'Guardando…'
                : 'Confirmar documentación completa'}
            </button>
            <button
              type="button"
              className="btn btn-ghost"
              disabled={enviando !== null}
              onClick={() => enviar('Sin movimientos')}
            >
              {enviando === 'sin-movimientos'
                ? 'Guardando…'
                : 'Este mes no he tenido movimientos'}
            </button>
          </div>

          {!todasMarcadas && (
            <p className={styles.pista}>
              Marca las cuatro casillas para poder confirmar.
            </p>
          )}
        </section>
      ) : (
        <section className="panel">
          <h2 className="panel-title">
            {ultimoConfirmado
              ? `${nombreMes(ultimoConfirmado.mes).split(' ')[0]} confirmado`
              : 'No tienes meses pendientes'}
          </h2>
          <p className={styles.intro}>{textoSinPendientes(ultimoConfirmado)}</p>
        </section>
      )}
    </>
  );
}

/**
 * Qué contarle al cliente cuando no le queda ningún mes por confirmar. Si el
 * último lo confirmó él, se le recuerda cuándo y con qué palabras, que es su
 * prueba ante nosotros.
 */
function textoSinPendientes(ultimo: Cierre | undefined): string {
  if (!ultimo) {
    return 'No hay ningún mes esperando tu confirmación. Cuando toque cerrar uno, te avisaremos por correo y aparecerá aquí.';
  }

  const que =
    ultimo.confirmacion === 'Sin movimientos'
      ? `Nos indicaste que ${mesEnFrase(ultimo.mes)} no tuvo movimientos`
      : `Confirmaste la documentación de ${mesEnFrase(ultimo.mes)}`;

  return `${que} el ${fechaHoraLarga(ultimo.fechaConfirmacion)}. Si luego encuentras algo más, súbelo a Quantum y avísanos en Consultas.`;
}
