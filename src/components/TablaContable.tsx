'use client';

import { useState } from 'react';
import type { FilaContable } from '@/lib/excel-parser';
import styles from './TablaContable.module.css';

interface TablaContableProps {
  filas: FilaContable[];
  titulo?: string;
}

function formatearEuros(n: number): string {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(n);
}

function formatearVariacion(v: number | null): string {
  if (v === null) return '—';
  return `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`;
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

  // Determina si una fila está visible en función de los grupos colapsados
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
    if (fila.tipo === 'total') {
      return true;
    }
    // cuenta
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
              const variacion = fila.variacion;

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
                  <td
                    className={`${styles.tdNum} ${
                      fila.valorActual < 0 ? styles.negativo : ''
                    }`}
                  >
                    {formatearEuros(fila.valorActual)}
                  </td>
                  <td
                    className={`${styles.tdNum} ${
                      fila.valorAnterior < 0 ? styles.negativo : ''
                    }`}
                  >
                    {formatearEuros(fila.valorAnterior)}
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
