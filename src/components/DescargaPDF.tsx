'use client';

import { useState } from 'react';
import type { MetricasInforme } from '@/lib/informe-tipos';
import type { FilaBalance } from '@/lib/balance-tipos';

interface Props {
  metricas: MetricasInforme;
  periodo: string;
  nombreCliente: string;
  analisis: string | null;
  filasBalance: FilaBalance[] | null;
  filasPyG: FilaBalance[] | null;
  esperandoAnalisis?: boolean;
}

type RGB = [number, number, number];

export default function DescargaPDF({ metricas, periodo, nombreCliente, analisis, filasBalance, filasPyG, esperandoAnalisis = false }: Props) {
  const [generando, setGenerando] = useState(false);

  const generarPDF = async () => {
    setGenerando(true);
    try {
      const { default: jsPDF } = await import('jspdf');

      const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const ancho = 210;
      const alto = 297;
      const margen = 15;
      const anchoUtil = ancho - margen * 2;

      const formatVal = (n: number) =>
        new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2 }).format(n) + ' €';
      const formatVar = (v: number) =>
        v > 0 ? `+${v.toFixed(1)}%` : v < 0 ? `${v.toFixed(1)}%` : '-';

      // ── PÁGINA 1 — PORTADA ──────────────────────────────────────────
      doc.setFillColor(37, 99, 235);
      doc.rect(0, 0, ancho, alto, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(32);
      doc.setFont('helvetica', 'bold');
      doc.text('EcomSolutions', margen, 80);

      doc.setFontSize(22);
      doc.setFont('helvetica', 'normal');
      doc.text('Informe Financiero', margen, 100);

      doc.setFontSize(16);
      doc.text(periodo, margen, 115);

      doc.setFontSize(14);
      doc.text(nombreCliente, margen, 135);

      doc.setFontSize(10);
      doc.text(
        `Generado el ${new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' })}`,
        margen,
        alto - 20,
      );
      doc.text('portal.ecomsolutions.es', margen, alto - 14);

      // ── PÁGINA 2 — RESUMEN EJECUTIVO ────────────────────────────────
      doc.addPage();

      const renderHeaderPagina = () => {
        doc.setFillColor(37, 99, 235);
        doc.rect(0, 0, ancho, 18, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('EcomSolutions', margen, 12);
        doc.setFont('helvetica', 'normal');
        doc.text(`Informe Financiero · ${periodo}`, ancho / 2, 12, { align: 'center' });
      };

      const renderFooterPagina = (num: number) => {
        doc.setTextColor(156, 163, 175);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('EcomSolutions · info@ecomsolutions.es · +34 661 959 962', margen, alto - 10);
        doc.text(`Página ${num}`, ancho - margen, alto - 10, { align: 'right' });
      };

      renderHeaderPagina();
      let y = 30;

      // Análisis IA
      if (analisis) {
        doc.setTextColor(17, 24, 39);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text('Análisis del período', margen, y);
        y += 8;

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(75, 85, 99);
        const lineas = doc.splitTextToSize(analisis, anchoUtil) as string[];
        doc.text(lineas, margen, y);
        y += lineas.length * 5 + 10;
      }

      // Métricas en 2 columnas
      doc.setTextColor(17, 24, 39);
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.text('Métricas principales', margen, y);
      y += 8;

      const col1x = margen;
      const col2x = ancho / 2 + 5;

      const metricasIzq = [
        { label: 'Ingresos', valor: metricas.ingresos },
        { label: 'Gastos personal', valor: metricas.gastos_personal },
        { label: 'Otros gastos', valor: metricas.otros_gastos },
        { label: 'Resultado explotación', valor: metricas.resultado_explotacion },
        { label: 'Resultado ejercicio', valor: metricas.resultado_ejercicio },
      ];
      const metricasDer = [
        { label: 'Total Activo', valor: metricas.total_activo },
        { label: 'Patrimonio Neto', valor: metricas.patrimonio_neto },
        { label: 'Caja disponible', valor: metricas.caja },
        { label: 'Clientes deudores', valor: metricas.clientes_deudores },
        { label: 'Deudas CP', valor: metricas.deudas_cp },
      ];

      doc.setFontSize(9);
      metricasIzq.forEach((m, i) => {
        const yRow = y + i * 10;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(75, 85, 99);
        doc.text(m.label, col1x, yRow);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(17, 24, 39);
        doc.text(formatVal(m.valor.actual), col1x + 55, yRow, { align: 'right' });
        const vc: RGB = m.valor.variacion > 0 ? [22, 163, 74] : m.valor.variacion < 0 ? [220, 38, 38] : [107, 114, 128];
        doc.setTextColor(vc[0], vc[1], vc[2]);
        doc.text(formatVar(m.valor.variacion), col1x + 77, yRow, { align: 'right' });
      });

      metricasDer.forEach((m, i) => {
        const yRow = y + i * 10;
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(75, 85, 99);
        doc.text(m.label, col2x, yRow);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(17, 24, 39);
        doc.text(formatVal(m.valor.actual), col2x + 55, yRow, { align: 'right' });
      });

      y += metricasIzq.length * 10 + 15;

      renderFooterPagina(2);

      // ── PÁGINAS 3+ — TABLAS CONTABLES ───────────────────────────────
      const renderTabla = (filas: FilaBalance[], titulo: string, paginaInicio: number): number => {
        doc.addPage();
        renderHeaderPagina();

        let ty = 28;
        let pagina = paginaInicio;

        doc.setTextColor(17, 24, 39);
        doc.setFontSize(13);
        doc.setFont('helvetica', 'bold');
        doc.text(titulo, margen, ty);
        ty += 8;

        // Cabecera tabla
        doc.setFillColor(243, 244, 246);
        doc.rect(margen, ty - 4, anchoUtil, 7, 'F');
        doc.setFontSize(7);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(107, 114, 128);
        doc.text('DESCRIPCIÓN', margen + 1, ty);
        doc.text('AÑO ACTUAL', ancho - margen - 45, ty, { align: 'right' });
        doc.text('AÑO ANTERIOR', ancho - margen - 20, ty, { align: 'right' });
        doc.text('VAR. %', ancho - margen, ty, { align: 'right' });
        ty += 6;

        for (const fila of filas) {
          if (ty > alto - 20) {
            renderFooterPagina(pagina);
            doc.addPage();
            pagina++;
            renderHeaderPagina();
            ty = 24;
          }

          if (fila.esTotal) {
            doc.setFillColor(239, 246, 255);
            doc.rect(margen, ty - 4, anchoUtil, 6, 'F');
          }

          const indent = fila.nivel === 1 ? 0 : fila.nivel === 2 ? 4 : 8;
          doc.setFontSize(fila.nivel === 3 ? 7 : 8);
          doc.setFont('helvetica', fila.nivel === 1 || fila.esTotal ? 'bold' : fila.nivel === 2 ? 'bold' : 'normal');

          const tR = fila.nivel === 3 ? 107 : 17;
          const tG = fila.nivel === 3 ? 114 : 24;
          const tB = fila.nivel === 3 ? 128 : 39;
          doc.setTextColor(tR, tG, tB);

          const desc = fila.descripcion || '';
          const descCorta = desc.length > 45 ? desc.substring(0, 42) + '...' : desc;
          doc.text(descCorta, margen + indent, ty);

          if (fila.valorActual !== null) {
            doc.setTextColor(17, 24, 39);
            doc.text(formatVal(fila.valorActual), ancho - margen - 45, ty, { align: 'right' });
          }
          if (fila.valorAnterior !== null) {
            doc.setTextColor(107, 114, 128);
            doc.text(formatVal(fila.valorAnterior), ancho - margen - 20, ty, { align: 'right' });
          }
          if (fila.variacion !== null) {
            const vc: RGB = fila.variacion > 0 ? [22, 163, 74] : fila.variacion < 0 ? [220, 38, 38] : [107, 114, 128];
            doc.setTextColor(vc[0], vc[1], vc[2]);
            doc.text(fila.variacion.toFixed(1) + '%', ancho - margen, ty, { align: 'right' });
          }

          ty += fila.nivel === 3 ? 5 : 6;
        }

        renderFooterPagina(pagina);
        return pagina + 1;
      };

      let paginaActual = 3;
      if (filasBalance && filasBalance.length > 0) {
        paginaActual = renderTabla(filasBalance, 'Balance de Situación', paginaActual);
      }
      if (filasPyG && filasPyG.length > 0) {
        renderTabla(filasPyG, 'Cuenta de Pérdidas y Ganancias', paginaActual);
      }

      doc.save(`Informe_${nombreCliente.replace(/\s+/g, '_')}_${periodo.replace(/\s+/g, '_')}.pdf`);
    } finally {
      setGenerando(false);
    }
  };

  const deshabilitado = generando || esperandoAnalisis;
  const label = generando ? 'Generando PDF...' : '📄 Descargar PDF';

  return (
    <button
      onClick={deshabilitado ? undefined : generarPDF}
      disabled={deshabilitado}
      title={esperandoAnalisis && !generando ? 'Esperando análisis...' : undefined}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '7px 14px',
        fontSize: 13,
        fontWeight: 600,
        color: deshabilitado ? '#9ca3af' : '#2563eb',
        background: deshabilitado ? '#f3f4f6' : '#eff6ff',
        border: `1px solid ${deshabilitado ? '#e5e7eb' : '#bfdbfe'}`,
        borderRadius: 8,
        cursor: deshabilitado ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap',
        transition: 'all 0.15s',
        flexShrink: 0,
      }}
    >
      {label}
    </button>
  );
}
