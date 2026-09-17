import Link from 'next/link';
import { requireSession } from '@/lib/session-server';
import {
  alertas,
  cifrasAcumulado,
  cifrasDelMes,
  getInformesPublicados,
  informesMensuales,
  serieAcumulado,
  serieBarras,
  sinComparaciones,
} from '@/lib/evolucion';
import { euros } from '@/lib/fechas';
import Chip from '@/components/Chip';
import GraficoBarras from '@/components/GraficoBarras';
import GraficoLineas from '@/components/GraficoLineas';
import TarjetaCifra from '@/components/TarjetaCifra';
import styles from './evolucion.module.css';

/**
 * "Mi evolución": cómo le va al negocio, con las cifras que publica el gestor.
 *
 * Pantalla de solo lectura. Todo sale de los informes publicados en Notion; el
 * portal no calcula contabilidad, solo compara lo que ya viene calculado.
 */
export default async function EvolucionPage() {
  const session = await requireSession();
  const informes = await getInformesPublicados(session.clienteId).catch(() => []);

  if (informes.length === 0) {
    return (
      <>
        <h1 className="page-title">Tu evolución</h1>
        <p className="lead">Cómo va tu negocio, mes a mes.</p>
        <section className="panel">
          <h2 className="panel-title">Aún no hemos publicado tu primer informe</h2>
          <p className={styles.parrafo}>
            En cuanto tu gestor cierre el primer período, aquí verás tus
            ingresos, tus gastos y cómo evolucionan. Te avisaremos por correo.
          </p>
        </section>
      </>
    );
  }

  // El informe que manda es el último mensual; los anuales no sustituyen al mes.
  const mensuales = informesMensuales(informes);
  const informe = mensuales[0] ?? informes[0];

  const mes = cifrasDelMes(informe, informes);
  const acumulado = cifrasAcumulado(informe);
  const barras = serieBarras(informes);
  const linea = serieAcumulado(informes);
  const avisos = alertas(informes);

  const ejercicio = informe.ejercicio ?? null;
  const hayPdf = informe.balancePdf || informe.pygPdf;
  // Con un solo informe, o con informes v1, no hay serie que dibujar: mejor no
  // enseñar una gráfica vacía.
  const hayBarras = barras.some((p) => p.ingresos !== null || p.gastos !== null);
  const faltanMeses = barras.some((p) => p.ingresos === null && p.gastos === null);
  const hayLinea = linea.some((p) => p.esteAnio !== null);
  // Primer informe del cliente: no hay nada con lo que comparar todavía.
  const primerInforme = sinComparaciones(mes, acumulado);

  return (
    <>
      <h1 className="page-title">Tu evolución</h1>
      <p className="lead">
        Último informe publicado: {informe.periodo}
        {informe.tipoPeriodo && informe.tipoPeriodo !== 'Mensual'
          ? ` · ${informe.tipoPeriodo.toLowerCase()}`
          : ''}
      </p>

      {/* EL PERÍODO */}
      {mes.disponible ? (
        <section className="panel">
          <h2 className="panel-title">{mes.titulo}</h2>
          <div className={styles.cifras}>
            {mes.cifras.map((cifra) => (
              <TarjetaCifra key={cifra.etiqueta} cifra={cifra} />
            ))}
          </div>
          {mes.nota && <p className={styles.pie}>{mes.nota}</p>}
        </section>
      ) : (
        <p className={`note ${styles.aviso}`}>{mes.explicacion}</p>
      )}

      {/* ACUMULADO DEL EJERCICIO */}
      {acumulado && (
        <section className="panel">
          <div className={styles.tituloFila}>
            <h2 className="panel-title">{acumulado.titulo}</h2>
            {acumulado.sinAnioAnterior && !primerInforme && (
              <Chip tono="neutral">Primer año con datos</Chip>
            )}
          </div>
          <div className={styles.cifras}>
            {acumulado.cifras.map((cifra) => (
              <TarjetaCifra key={cifra.etiqueta} cifra={cifra} />
            ))}
          </div>

          {(acumulado.mediaMensualIngresos || acumulado.caja) && (
            <div className={styles.extras}>
              {acumulado.mediaMensualIngresos && (
                <div className={styles.extra}>
                  <span>{acumulado.mediaMensualIngresos.etiqueta}</span>
                  <b>{euros(acumulado.mediaMensualIngresos.valor)}</b>
                </div>
              )}
              {acumulado.caja && (
                <div className={styles.extra}>
                  <span>{acumulado.caja.etiqueta}</span>
                  <b>{euros(acumulado.caja.valor)}</b>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {primerInforme && (
        <p className={`note ${styles.aviso}`}>
          Este es tu primer informe. A partir del próximo mes verás cómo
          evoluciona tu negocio.
        </p>
      )}

      {/* GRÁFICAS */}
      {(hayBarras || hayLinea) && (
        <section className={styles.graficas}>
          {hayBarras && (
            <GraficoBarras
              datos={barras}
              titulo="Ingresos y gastos de cada mes"
              nota={
                faltanMeses
                  ? 'Los meses sin barra no tienen informe publicado o no se puede calcular su dato mensual.'
                  : undefined
              }
            />
          )}
          {hayLinea && (
            <GraficoLineas
              datos={linea}
              titulo="Resultado acumulado del ejercicio"
              nombres={{
                esteAnio: ejercicio ? String(ejercicio) : 'Este año',
                anioAnterior: informe.ejercicioAnterior
                  ? String(informe.ejercicioAnterior)
                  : 'Año anterior',
              }}
            />
          )}
        </section>
      )}

      {/* AVISOS */}
      {avisos.length > 0 && (
        <section className="panel">
          <h2 className="panel-title">Lo que nos llama la atención</h2>
          {avisos.map((aviso) => (
            <div className="row" key={aviso.texto}>
              <div>{aviso.texto}</div>
              <Chip tono={aviso.tono}>
                {aviso.tono === 'alert' ? 'Ojo' : 'Revisar'}
              </Chip>
            </div>
          ))}
        </section>
      )}

      {/* TU GESTOR */}
      {(informe.comentarioGestor || hayPdf) && (
        <section className="panel">
          <h2 className="panel-title">Lo que dice tu gestor</h2>
          {informe.comentarioGestor && (
            <p className={styles.parrafo}>{informe.comentarioGestor}</p>
          )}
          {hayPdf && (
            <div className={`actions ${styles.descargas}`}>
              {informe.balancePdf && (
                <a
                  className="btn btn-ghost"
                  href={informe.balancePdf}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Balance en PDF
                </a>
              )}
              {informe.pygPdf && (
                <a
                  className="btn btn-ghost"
                  href={informe.pygPdf}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Cuenta de resultados en PDF
                </a>
              )}
            </div>
          )}
        </section>
      )}

      <p className={styles.pie}>
        Las cifras salen de tu contabilidad.{' '}
        <Link href="/dashboard/contabilidad" className={styles.enlace}>
          Ver mi contabilidad
        </Link>
        .
      </p>
    </>
  );
}
