'use client';

import { useState } from 'react';
import styles from './VencimientosList.module.css';

interface Vencimiento {
  id: string;
  nombre: string;
  fecha: string | null;
  estado: string;
}

interface VencimientosListProps {
  vencimientos: Vencimiento[];
  maxInicial?: number;
  mostrarExpand?: boolean;
}

function limpiarNombre(nombre: string): string {
  if (nombre.includes(' - ')) {
    return nombre.split(' - ').slice(1).join(' · ');
  }
  return nombre;
}

function formatearFecha(fecha: string): string {
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function diasRestantes(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const fv = new Date(fecha);
  fv.setHours(0, 0, 0, 0);
  return Math.ceil((fv.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
}

function diasBadge(dias: number): { texto: string; clase: string } {
  if (dias <= 0) return { texto: 'VENCIDO', clase: 'diasVencido' };
  if (dias <= 7) return { texto: `¡${dias}d!`, clase: 'diasMuyUrgente' };
  if (dias <= 30) return { texto: `${dias} días`, clase: 'diasUrgente' };
  return { texto: `${dias} días`, clase: 'diasNormal' };
}

const ESTADO_CONFIG: Record<string, { clase: string; label: string }> = {
  Pendiente:  { clase: 'badgeWarning', label: 'Pendiente' },
  Presentado: { clase: 'badgeSuccess', label: 'Presentado' },
  Urgente:    { clase: 'badgeDanger',  label: 'Urgente' },
};

export default function VencimientosList({
  vencimientos,
  maxInicial = 5,
  mostrarExpand = true,
}: VencimientosListProps) {
  const [expandido, setExpandido] = useState(false);

  if (vencimientos.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>✓</span>
        <p>Todo al día. No hay vencimientos próximos.</p>
      </div>
    );
  }

  const mostrar = mostrarExpand && !expandido
    ? vencimientos.slice(0, maxInicial)
    : vencimientos;
  const hayMas = mostrarExpand && vencimientos.length > maxInicial;

  return (
    <div>
      <ul className={styles.lista}>
        {mostrar.map((v) => {
          const nombre = limpiarNombre(v.nombre);
          const dias = v.fecha ? diasRestantes(v.fecha) : null;
          const badge = dias !== null ? diasBadge(dias) : null;
          const estadoConf = ESTADO_CONFIG[v.estado] ?? ESTADO_CONFIG.Pendiente;

          return (
            <li key={v.id} className={styles.item}>
              <div className={styles.itemLeft}>
                <span className={styles.nombre}>{nombre}</span>
                {v.fecha && (
                  <span className={styles.fecha}>{formatearFecha(v.fecha)}</span>
                )}
              </div>
              <div className={styles.itemRight}>
                <span className={`${styles.badge} ${styles[estadoConf.clase]}`}>
                  {estadoConf.label}
                </span>
                {badge && (
                  <span className={`${styles.dias} ${styles[badge.clase]}`}>
                    {badge.texto}
                  </span>
                )}
              </div>
            </li>
          );
        })}
      </ul>
      {hayMas && (
        <button className={styles.verTodos} onClick={() => setExpandido(!expandido)}>
          {expandido ? 'Ver menos' : `Ver todos (${vencimientos.length})`}
        </button>
      )}
    </div>
  );
}
