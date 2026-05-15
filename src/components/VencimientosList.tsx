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
}

function limpiarNombre(nombre: string): string {
  if (nombre.includes(' - ')) {
    return nombre.split(' - ').slice(1).join(' · ');
  }
  return nombre;
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  try {
    const soloFecha = iso.split('T')[0];
    const [year, month, day] = soloFecha.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    return d.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function calcDias(iso: string | null): number | null {
  if (!iso) return null;
  try {
    const soloFecha = iso.split('T')[0];
    const [year, month, day] = soloFecha.split('-').map(Number);
    const fecha = new Date(year, month - 1, day);
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return Math.ceil((fecha.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
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

function Fila({ v }: { v: Vencimiento }) {
  const nombre = limpiarNombre(v.nombre);
  const dias = calcDias(v.fecha);
  const badge = dias !== null ? diasBadge(dias) : null;
  const estadoConf = ESTADO_CONFIG[v.estado] ?? ESTADO_CONFIG.Pendiente;

  return (
    <li className={styles.item}>
      <span className={styles.nombre}>{nombre}</span>
      <span className={styles.fechaCol}>
        {v.fecha ? formatFecha(v.fecha) : '—'}
      </span>
      <div className={styles.itemRight}>
        {badge && (
          <span className={`${styles.dias} ${styles[badge.clase]}`}>
            {badge.texto}
          </span>
        )}
        <span className={`${styles.badge} ${styles[estadoConf.clase]}`}>
          {estadoConf.label}
        </span>
      </div>
    </li>
  );
}

export default function VencimientosList({ vencimientos, maxInicial = 5 }: VencimientosListProps) {
  const [expandido, setExpandido] = useState(false);

  if (vencimientos.length === 0) {
    return (
      <div className={styles.empty}>
        <span className={styles.emptyIcon}>✓</span>
        <p>Todo al día. No hay vencimientos próximos.</p>
      </div>
    );
  }

  console.log('Vencimiento completo[0]:', JSON.stringify(vencimientos[0]));
  console.log('Vencimiento fecha raw:', vencimientos[0]?.fecha);
  const vencidos = vencimientos.filter(v => { const d = calcDias(v.fecha); return d !== null && d <= 0; });
  const proximos = vencimientos.filter(v => { const d = calcDias(v.fecha); return d === null || d > 0; });
  const proximosMostrar = expandido ? proximos : proximos.slice(0, maxInicial);
  const hayMas = proximos.length > maxInicial;

  return (
    <div>
      {vencidos.length > 0 && (
        <>
          <p className={styles.seccionLabel} style={{ color: 'var(--color-danger)' }}>
            ⚠️ Vencidos
          </p>
          <ul className={styles.lista}>
            {vencidos.map(v => <Fila key={v.id} v={v} />)}
          </ul>
        </>
      )}

      {proximos.length > 0 && (
        <>
          {vencidos.length > 0 && (
            <p className={styles.seccionLabel} style={{ marginTop: 16 }}>
              Próximos
            </p>
          )}
          <ul className={styles.lista}>
            {proximosMostrar.map(v => <Fila key={v.id} v={v} />)}
          </ul>
          {hayMas && (
            <button className={styles.verTodos} onClick={() => setExpandido(!expandido)}>
              {expandido ? 'Ver menos' : `Ver todos (${proximos.length})`}
            </button>
          )}
        </>
      )}
    </div>
  );
}
