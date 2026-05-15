'use client';

import { useState } from 'react';
import type { FilaContable } from '@/lib/excel-parser';
import styles from './TablaContable.module.css';

interface TablaContableProps {
  filas: FilaContable[];
  titulo?: string;
}

function formatearEuros(n: unknown): string {
  const num = typeof n === 'number' && !isNaN(n) ? n : 0;
  return new Intl.NumberFormat('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

function formatearVariacion(v: unknown): string {
  if (v === null || v === undefined) return '—';
  const num = typeof v === 'number' && !isNaN(v) ? v : 0;
  return `${num >= 0 ? '+' : ''}${num.toFixed(1)}%`;
}

export default function TablaContable({ filas, titulo }: TablaContableProps) {
  const [colapsados, setColapsados] = useState<Set<string>>(new Set());

  function toggleColapso(codigo: string) {
    setColapsados((prev) => {
      const next = new Set(prev);
      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }
      return next;
    });
  }

  let grupoActual: string | null = null;
  let subgrupoActual: string | null = null;

  const filasVisibles = filas.filter((fila) => {
    if (fila.tipo === 'grupo') {
      grupoActual = fila.codigo;
      subgrupoActual = null;
      return true;
    }
    if (fila.tipo === 'subgrupo') {
      subgrupoActual = fila.codigo;
      if (grupoActual && colapsados.has(grupoActual)) return false;
      return true;
    }
    if (fila.tipo === 'total') return true;
    if (grupoActual && colapsados.has(grupoActual)) return false;
    if (subgrupoActual && colapsados.has(subgrupoActual)) return false;
    return true;
  });

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
              <th className={styles.thNum}>Variación</th>
            </tr>
          </thead>
          <tbody>
            {filasVisibles.map((fila, i) => {
              const esColapsable = fila.tipo === 'grupo' || fila.tipo === 'subgrupo';
              const estaColapsado = colapsados.has(fila.codigo);

              const valorActual = typeof fila.valorActual === 'number' ? fila.valorActual : 0;
              const valorAnterior = typeof fila.valorAnterior === 'number' ? fila.valorAnterior : 0;
              const variacion = typeof fila.variacion === 'number' ? fila.variacion : null;

              return (
                <tr
                  key={`${fila.codigo}-${i}`}
                  className={`
                    ${styles.row}
                    ${fila.tipo === 'grupo' ? styles.rowGrupo : ''}
                    ${fila.tipo === 'subgrupo' ? styles.rowSubgrupo : ''}
                    ${fila.tipo === 'total' ? styles.rowTotal : ''}
                    ${fila.tipo === 'cuenta' ? styles.rowCuenta : ''}
                    ${esColapsable ? styles.rowColapsable : ''}
                  `}
                  onClick={esColapsable ? () => toggleColapso(fila.codigo) : undefined}
                >
                  <td className={styles.tdDesc}>
                    <span
                      className={styles.indent}
                      style={{ paddingLeft: fila.nivel === 3 ? 40 : fila.nivel === 2 ? 20 : 0 }}
                    >
                      {esColapsable && (
                        <span className={styles.chevron}>
                          {estaColapsado ? '▶' : '▼'}
                        </span>
                      )}
                      <span className={styles.codigo}>{fila.codigo}</span>
                      {fila.tipo !== 'cuenta' && (
                        <span className={styles.descripcion}>{fila.descripcion}</span>
                      )}
                      {fila.tipo === 'cuenta' && (
                        <span className={styles.descripcionCuenta}>{fila.descripcion}</span>
                      )}
                    </span>
                  </td>
                  <td className={`${styles.tdNum} ${valorActual < 0 ? styles.negativo : ''}`}>
                    {formatearEuros(valorActual)}
                  </td>
                  <td className={`${styles.tdNum} ${valorAnterior < 0 ? styles.negativo : ''}`}>
                    {formatearEuros(valorAnterior)}
                  </td>
                  <td
                    className={`${styles.tdNum} ${
                      variacion !== null && variacion < 0 ? styles.negativo : ''
                    } ${
                      variacion !== null && variacion > 0 ? styles.positivo : ''
                    }`}
                  >
                    {formatearVariacion(variacion)}
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
