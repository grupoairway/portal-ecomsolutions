'use client';

import { useEffect, useState } from 'react';
import type { MetricasInforme } from '@/lib/informe-tipos';

interface Props {
  metricas: MetricasInforme;
  periodo: string;
  nombreCliente: string;
  onAnalisis?: (texto: string) => void;
}

export default function AnalisisIA({ metricas, periodo, nombreCliente, onAnalisis }: Props) {
  const [analisis, setAnalisis] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setAnalisis(null);
    setError(null);

    fetch('/api/analisis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ metricas, periodo, nombreCliente }),
    })
      .then((res) => res.json())
      .then((data: { analisis?: string; error?: string }) => {
        if (data.analisis) {
          setAnalisis(data.analisis);
          onAnalisis?.(data.analisis);
        } else {
          setError('Sin análisis');
        }
      })
      .catch(() => setError('Error'))
      .finally(() => setLoading(false));
  }, [periodo]);

  if (error) return null;

  if (loading) {
    return (
      <div style={{
        background: '#f8fafc',
        border: '1px solid #e2e8f0',
        borderLeft: '4px solid #2563eb',
        borderRadius: 12,
        padding: '1.25rem 1.5rem',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      }}>
        {[85, 95, 60].map((w, i) => (
          <div
            key={i}
            style={{
              height: 14,
              borderRadius: 6,
              background: '#e2e8f0',
              width: `${w}%`,
              animation: 'pulse 1.5s ease-in-out infinite',
            }}
          />
        ))}
        <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}`}</style>
      </div>
    );
  }

  if (!analisis) return null;

  return (
    <div style={{
      background: '#f8fafc',
      border: '1px solid #e2e8f0',
      borderLeft: '4px solid #2563eb',
      borderRadius: 12,
      padding: '1.25rem 1.5rem',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        marginBottom: '0.75rem',
      }}>
        <span style={{ fontSize: 16 }}>🤖</span>
        <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
          Análisis IA · {periodo}
        </span>
        <span style={{
          fontSize: 10,
          fontWeight: 600,
          padding: '2px 7px',
          borderRadius: 20,
          background: '#dbeafe',
          color: '#1d4ed8',
          marginLeft: 'auto',
        }}>
          Generado por IA
        </span>
      </div>
      <p style={{
        fontSize: '0.9rem',
        lineHeight: 1.7,
        color: '#374151',
        margin: 0,
      }}>
        {analisis}
      </p>
    </div>
  );
}
