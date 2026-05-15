import type { FilaBalance } from '@/lib/balance-tipos';
import styles from './TablaContable.module.css';

interface TablaContableProps {
  filas: FilaBalance[];
  titulo?: string;
}

function formatEuros(v: number | null): string {
  if (v === null || v === undefined) return '—';
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(v) + ' €';
}

function varBadge(v: number | null): { texto: string; color: string } {
  if (v === null || v === undefined) return { texto: '—', color: 'var(--color-muted)' };
  if (v > 0) return { texto: `+${v.toFixed(1)}%`, color: 'var(--color-success)' };
  if (v < 0) return { texto: `${v.toFixed(1)}%`, color: 'var(--color-danger)' };
  return { texto: '0.0%', color: 'var(--color-muted)' };
}

function getRowStyle(fila: FilaBalance): React.CSSProperties {
  if (fila.esTotal) {
    return { background: '#eff6ff', borderTop: '2px solid #bfdbfe', fontWeight: 700 };
  }
  if (fila.nivel === 1) return { background: '#f9fafb' };
  return { background: '#ffffff' };
}

function getDescStyle(fila: FilaBalance): React.CSSProperties {
  if (fila.esTotal) return { fontWeight: 700, fontSize: '0.875rem', paddingLeft: 0 };
  if (fila.nivel === 1) return { fontWeight: 700, fontSize: '0.9rem', paddingLeft: 0 };
  if (fila.nivel === 2) return { fontWeight: 600, fontSize: '0.875rem', paddingLeft: 16 };
  return { fontWeight: 400, fontSize: '0.825rem', color: '#6b7280', paddingLeft: 32 };
}

export default function TablaContable({ filas, titulo }: TablaContableProps) {
  return (
    <div className={styles.wrapper}>
      {titulo && <h3 className={styles.titulo}>{titulo}</h3>}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.thDesc}>Descripción</th>
              <th className={styles.thNum}>Año actual</th>
              <th className={styles.thNum}>Año anterior</th>
              <th className={styles.thNum}>Var. %</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((fila, i) => {
              const vd = varBadge(fila.variacion);
              const descStyle = getDescStyle(fila);

              return (
                <tr key={`${fila.codigo}-${i}`} className={styles.row} style={getRowStyle(fila)}>
                  <td className={styles.tdDesc}>
                    <span style={{ display: 'flex', alignItems: 'baseline', gap: 6, paddingLeft: descStyle.paddingLeft as number }}>
                      {fila.codigo && fila.nivel < 3 && (
                        <span className={styles.codigo}>{fila.codigo}</span>
                      )}
                      <span style={{ fontWeight: descStyle.fontWeight, fontSize: descStyle.fontSize as string, color: descStyle.color as string }}>
                        {fila.descripcion}
                      </span>
                    </span>
                  </td>
                  <td className={`${styles.tdNum} ${fila.valorActual !== null && fila.valorActual < 0 ? styles.negativo : ''}`}>
                    {formatEuros(fila.valorActual)}
                  </td>
                  <td className={`${styles.tdNum} ${fila.valorAnterior !== null && fila.valorAnterior < 0 ? styles.negativo : ''}`}>
                    {formatEuros(fila.valorAnterior)}
                  </td>
                  <td className={styles.tdNum} style={{ color: vd.color }}>
                    {vd.texto}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
