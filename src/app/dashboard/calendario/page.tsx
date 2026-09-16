import { requireSession } from '@/lib/session-server';
import {
  etiquetaEstado,
  etiquetaImporte,
  getVencimientos,
  type Vencimiento,
} from '@/lib/vencimientos';
import { anioPeriodo } from '@/lib/periodos';
import { euros, fechaCorta, hoy, soloFecha } from '@/lib/fechas';
import Chip from '@/components/Chip';

export const dynamic = 'force-dynamic';

/** "3T 2026" -> "3T". El año ya va en el título de la página. */
function periodoCorto(periodo: string): string {
  return periodo.replace(/\s*\d{4}\s*$/, '').trim() || periodo;
}

/** Columna "Resultado": importe con su signo en cristiano, o guion. */
function resultado(v: Vencimiento): string {
  // Una informativa no lleva importe: no hay nada que pagar ni que cobrar.
  if (v.resultado === 'Informativo') return 'Informativo';
  if (v.importe == null) {
    return v.resultado && v.resultado !== 'A pagar' ? v.resultado : '—';
  }
  // Lo que sale a su favor va con signo y con su destino: "-450,25 € a compensar".
  if (v.esNegativo) return etiquetaImporte(v) ?? euros(v.importe);
  if (v.resultado === 'Cero' || v.importe === 0) return 'Sin importe';
  return euros(v.importe);
}

export default async function CalendarioPage() {
  const session = await requireSession();
  const vencimientos = await getVencimientos(session.clienteId).catch(
    () => [] as Vencimiento[],
  );

  // El año en curso según los propios vencimientos; si no hay ninguno del año
  // actual, se enseña el más reciente que exista.
  const anioActual = Number(hoy().slice(0, 4));
  const anios = Array.from(
    new Set(
      vencimientos
        .map((v) => anioPeriodo(v.periodo) ?? Number(soloFecha(v.fechaLimite)?.slice(0, 4)))
        .filter((a): a is number => Number.isFinite(a)),
    ),
  ).sort((a, b) => b - a);
  const anio = anios.includes(anioActual) ? anioActual : (anios[0] ?? anioActual);

  const delAnio = vencimientos
    .filter(
      (v) =>
        (anioPeriodo(v.periodo) ?? Number(soloFecha(v.fechaLimite)?.slice(0, 4))) === anio,
    )
    .sort((a, b) =>
      (soloFecha(b.fechaLimite) ?? '').localeCompare(soloFecha(a.fechaLimite) ?? ''),
    );

  return (
    <>
      <h1 className="page-title">Calendario fiscal</h1>
      <p className="lead">
        Todos tus impuestos de {anio} y en qué punto está cada uno.
      </p>

      {delAnio.length === 0 ? (
        <section className="panel">
          <h2 className="panel-title">Todavía no hay impuestos de {anio}</h2>
          <p style={{ margin: 0, color: 'var(--muted)' }}>
            En cuanto preparemos tu calendario fiscal lo verás aquí.
          </p>
        </section>
      ) : (
        <div className="panel tablewrap">
          <table>
            <thead>
              <tr>
                <th>Impuesto</th>
                <th>Periodo</th>
                <th>Plazo</th>
                <th>Resultado</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {delAnio.map((v) => {
                const etiqueta = etiquetaEstado(v);
                return (
                  <tr key={v.id}>
                    <td>
                      {v.modelo}
                      {v.modeloDescripcion !== v.modelo
                        ? ` · ${v.modeloDescripcion}`
                        : ''}
                    </td>
                    <td>{periodoCorto(v.periodo)}</td>
                    <td>
                      {fechaCorta(v.fechaLimitePresentacion ?? v.fechaLimite) || '—'}
                    </td>
                    <td>{resultado(v)}</td>
                    <td>
                      <Chip tono={etiqueta.tono}>{etiqueta.texto}</Chip>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
