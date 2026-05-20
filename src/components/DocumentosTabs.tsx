'use client';

import { useState } from 'react';
import DocumentosGrid from './DocumentosGrid';
import SubirDocumentacion from './SubirDocumentacion';
import type { DocumentoNotion } from '@/lib/notion';
import styles from './DocumentosTabs.module.css';

interface Props {
  documentos: DocumentoNotion[];
}

type Tab = 'mis-documentos' | 'subir';

export default function DocumentosTabs({ documentos }: Props) {
  const [tab, setTab] = useState<Tab>('mis-documentos');

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'mis-documentos' ? styles.tabActivo : ''}`}
          onClick={() => setTab('mis-documentos')}
        >
          <span className={styles.tabIcono}>📁</span>
          Mis documentos
        </button>
        <button
          type="button"
          className={`${styles.tab} ${tab === 'subir' ? styles.tabActivo : ''}`}
          onClick={() => setTab('subir')}
        >
          <span className={styles.tabIcono}>📤</span>
          Subir documentación
        </button>
      </div>

      <div className={styles.panelContent}>
        {tab === 'mis-documentos' && <DocumentosGrid documentos={documentos} />}
        {tab === 'subir' && <SubirDocumentacion />}
      </div>
    </div>
  );
}
