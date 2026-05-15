'use client';

import { useState } from 'react';
import type { DocumentoNotion, TipoDocumento } from '@/lib/notion';
import styles from './DocumentosGrid.module.css';

const TIPOS: Array<TipoDocumento | 'Todos'> = [
  'Todos',
  'Modelos presentados',
  'Escrituras y contratos',
  'Nóminas',
  'Notificaciones',
  'Otros',
];

const EJERCICIOS = ['Todos', '2024', '2025', '2026'] as const;

const TIPO_ICONOS: Record<string, string> = {
  'Modelos presentados': '📄',
  'Escrituras y contratos': '📋',
  'Nóminas': '💰',
  'Notificaciones': '🔔',
  'Otros': '📁',
};

function formatearFecha(fecha: string | null): string {
  if (!fecha) return '—';
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

interface DocumentosGridProps {
  documentos: DocumentoNotion[];
}

export default function DocumentosGrid({ documentos }: DocumentosGridProps) {
  const [tipoActivo, setTipoActivo] = useState<TipoDocumento | 'Todos'>('Todos');
  const [ejercicioActivo, setEjercicioActivo] = useState<string>('Todos');

  const filtrados = documentos.filter((doc) => {
    const matchTipo = tipoActivo === 'Todos' || doc.tipo === tipoActivo;
    const matchEjercicio = ejercicioActivo === 'Todos' || doc.ejercicio === ejercicioActivo;
    return matchTipo && matchEjercicio;
  });

  return (
    <div className={styles.wrapper}>
      {/* FILTROS */}
      <div className={styles.filtros}>
        <div className={styles.filtroGrupo}>
          {TIPOS.map((tipo) => (
            <button
              key={tipo}
              type="button"
              className={`${styles.filtroBtn} ${tipoActivo === tipo ? styles.filtroBtnActivo : ''}`}
              onClick={() => setTipoActivo(tipo)}
            >
              {tipo !== 'Todos' && <span className={styles.filtroBtnIcono}>{TIPO_ICONOS[tipo]}</span>}
              {tipo}
            </button>
          ))}
        </div>

        <div className={styles.filtroGrupo}>
          {EJERCICIOS.map((ej) => (
            <button
              key={ej}
              type="button"
              className={`${styles.filtroBtn} ${styles.filtroBtnEjercicio} ${ejercicioActivo === ej ? styles.filtroBtnActivo : ''}`}
              onClick={() => setEjercicioActivo(ej)}
            >
              {ej}
            </button>
          ))}
        </div>
      </div>

      {/* GRID */}
      {filtrados.length === 0 ? (
        <div className={styles.empty}>
          <span className={styles.emptyIcono}>📂</span>
          <p className={styles.emptyTexto}>No hay documentos en esta categoría todavía.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtrados.map((doc) => (
            <div key={doc.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <span className={styles.cardIcono}>{TIPO_ICONOS[doc.tipo] ?? '📁'}</span>
                {doc.ejercicio && (
                  <span className={styles.badgeEjercicio}>{doc.ejercicio}</span>
                )}
              </div>

              <h3 className={styles.cardNombre}>{doc.nombre}</h3>

              <div className={styles.cardMeta}>
                <span className={styles.cardTipo}>{doc.tipo}</span>
                {doc.fecha && (
                  <span className={styles.cardFecha}>· {formatearFecha(doc.fecha)}</span>
                )}
              </div>

              {doc.descripcion && (
                <p className={styles.cardDesc}>{doc.descripcion}</p>
              )}

              <div className={styles.cardFooter}>
                {doc.urlDrive ? (
                  <a
                    href={doc.urlDrive}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.btnDescargar}
                  >
                    Descargar →
                  </a>
                ) : (
                  <span className={styles.btnNoDisponible}>No disponible</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
