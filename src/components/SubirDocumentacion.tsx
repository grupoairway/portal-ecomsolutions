'use client';

import { useState, useRef, useCallback } from 'react';
import type { VencimientoPendiente } from '@/lib/notion';
import styles from './SubirDocumentacion.module.css';

const TIPOS_DOCUMENTO = [
  'Facturas',
  'Extracto bancario',
  'Certificado retenciones',
  'Contrato',
  'Nóminas',
  'Otros',
] as const;

const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

function formatSize(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatFecha(fecha: string | null): string {
  if (!fecha) return '';
  return new Date(fecha).toLocaleDateString('es-ES', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function validarArchivo(file: File): string | null {
  if (file.size > MAX_SIZE) return `"${file.name}" supera el límite de 10MB`;
  if (!ALLOWED_TYPES.has(file.type)) return `"${file.name}" tiene un formato no permitido`;
  return null;
}

interface Props {
  vencimientos: VencimientoPendiente[];
}

export default function SubirDocumentacion({ vencimientos }: Props) {
  const [vencimientoId, setVencimientoId] = useState('');
  const [tipoDocumento, setTipoDocumento] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [archivos, setArchivos] = useState<File[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [exito, setExito] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const agregarArchivos = useCallback((lista: FileList | File[]) => {
    const nuevos = Array.from(lista);
    const errores: string[] = [];
    const validos: File[] = [];

    for (const f of nuevos) {
      const err = validarArchivo(f);
      if (err) errores.push(err);
      else validos.push(f);
    }

    if (errores.length > 0) setError(errores.join('. '));

    setArchivos((prev) => {
      const existentes = new Set(prev.map((f) => f.name + f.size));
      return [...prev, ...validos.filter((f) => !existentes.has(f.name + f.size))];
    });
  }, []);

  function quitarArchivo(idx: number) {
    setArchivos((prev) => prev.filter((_, i) => i !== idx));
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    agregarArchivos(e.dataTransfer.files);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!vencimientoId) { setError('Selecciona un vencimiento'); return; }
    if (!tipoDocumento) { setError('Selecciona el tipo de documento'); return; }
    if (archivos.length === 0) { setError('Añade al menos un archivo'); return; }

    setEnviando(true);
    try {
      const vencimiento = vencimientos.find((v) => v.id === vencimientoId);
      const fd = new FormData();
      fd.append('vencimientoId', vencimientoId);
      fd.append('vencimientoNombre', vencimiento?.nombre ?? '');
      fd.append('tipoDocumento', tipoDocumento);
      fd.append('descripcion', descripcion);
      for (const archivo of archivos) {
        fd.append('archivos', archivo);
      }

      const res = await fetch('/api/documentacion-cliente', { method: 'POST', body: fd });
      const data = await res.json() as { error?: string };

      if (!res.ok) throw new Error(data.error ?? 'Error al enviar');

      setExito(true);
      setVencimientoId('');
      setTipoDocumento('');
      setDescripcion('');
      setArchivos([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al enviar la documentación');
    } finally {
      setEnviando(false);
    }
  }

  if (exito) {
    return (
      <div className={styles.exito}>
        <span className={styles.exitoIcono}>✅</span>
        <h3 className={styles.exitoTitulo}>Documentación enviada</h3>
        <p className={styles.exitoTexto}>
          Documentación enviada correctamente. Nuestro equipo la revisará en breve.
        </p>
        <button type="button" className={styles.btnNuevo} onClick={() => setExito(false)}>
          Enviar más documentación
        </button>
      </div>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      <div className={styles.campo}>
        <label className={styles.label}>Vencimiento fiscal *</label>
        <select
          className={styles.select}
          value={vencimientoId}
          onChange={(e) => setVencimientoId(e.target.value)}
        >
          <option value="">Selecciona un vencimiento...</option>
          {vencimientos.map((v) => (
            <option key={v.id} value={v.id}>
              {v.nombre}
              {v.fecha ? ` · ${formatFecha(v.fecha)}` : ''}
              {v.estado !== 'Pendiente' ? ` (${v.estado})` : ''}
            </option>
          ))}
        </select>
        {vencimientos.length === 0 && (
          <p className={styles.hint}>No tienes vencimientos pendientes en este momento.</p>
        )}
      </div>

      <div className={styles.campo}>
        <label className={styles.label}>Tipo de documento *</label>
        <select
          className={styles.select}
          value={tipoDocumento}
          onChange={(e) => setTipoDocumento(e.target.value)}
        >
          <option value="">Selecciona el tipo...</option>
          {TIPOS_DOCUMENTO.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>

      <div className={styles.campo}>
        <label className={styles.label}>
          Descripción <span className={styles.opcional}>(opcional)</span>
        </label>
        <textarea
          className={styles.textarea}
          placeholder="Añade cualquier nota o aclaración sobre los documentos..."
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          rows={3}
        />
      </div>

      <div className={styles.campo}>
        <label className={styles.label}>Archivos *</label>
        <div
          role="button"
          tabIndex={0}
          className={`${styles.dropzone} ${dragOver ? styles.dropzoneActivo : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png,.xlsx,.xls"
            className={styles.fileInput}
            onChange={(e) => e.target.files && agregarArchivos(e.target.files)}
          />
          <span className={styles.dropzoneIcono}>📂</span>
          <p className={styles.dropzoneTexto}>
            {dragOver
              ? 'Suelta aquí los archivos'
              : 'Arrastra archivos aquí o haz clic para seleccionar'}
          </p>
          <p className={styles.dropzoneInfo}>PDF, JPG, PNG, Excel · Máx. 10MB por archivo</p>
        </div>

        {archivos.length > 0 && (
          <ul className={styles.listaArchivos}>
            {archivos.map((f, i) => (
              <li key={`${f.name}-${f.size}`} className={styles.archivoItem}>
                <span className={styles.archivoIcono}>📄</span>
                <span className={styles.archivoNombre}>{f.name}</span>
                <span className={styles.archivoSize}>{formatSize(f.size)}</span>
                <button
                  type="button"
                  className={styles.btnEliminar}
                  onClick={() => quitarArchivo(i)}
                  aria-label={`Eliminar ${f.name}`}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className={styles.errorMsg}>{error}</p>}

      <button type="submit" className={styles.btnEnviar} disabled={enviando}>
        {enviando ? 'Enviando...' : 'Enviar documentación →'}
      </button>
    </form>
  );
}
