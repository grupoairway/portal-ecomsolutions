import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';
import type { MetricasInforme } from '@/lib/informe-tipos';

export async function POST(req: NextRequest) {
  try {
    const { metricas, periodo, nombreCliente } = (await req.json()) as {
      metricas: MetricasInforme;
      periodo: string;
      nombreCliente: string;
    };

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const prompt = `Eres el asesor fiscal de ${nombreCliente}. Analiza estos datos financieros del período ${periodo} y genera un resumen ejecutivo breve (máximo 4 frases) en español, en tono profesional pero cercano, dirigido directamente al cliente empresario (usa "tu empresa" o "has").

Datos:
- Ingresos: ${metricas.ingresos.actual}€ (anterior: ${metricas.ingresos.anterior}€, variación: ${metricas.ingresos.variacion}%)
- Gastos personal: ${metricas.gastos_personal.actual}€
- Otros gastos: ${metricas.otros_gastos.actual}€
- Resultado explotación: ${metricas.resultado_explotacion.actual}€
- Resultado ejercicio: ${metricas.resultado_ejercicio.actual}€ (anterior: ${metricas.resultado_ejercicio.anterior}€, variación: ${metricas.resultado_ejercicio.variacion}%)
- Total Activo: ${metricas.total_activo.actual}€
- Patrimonio Neto: ${metricas.patrimonio_neto.actual}€
- Deudas CP: ${metricas.deudas_cp.actual}€
- Caja disponible: ${metricas.caja.actual}€

Destaca los puntos más relevantes: evolución de ingresos, rentabilidad, situación de tesorería y cualquier punto de atención. Termina siempre con una frase de recomendación o próximo paso.
No uses bullet points, solo párrafo continuo.`;

    const message = await client.messages.create({
      model: 'claude-haiku-4-5',
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    });

    const texto = message.content[0].type === 'text' ? message.content[0].text : '';
    return NextResponse.json({ analisis: texto });
  } catch {
    return NextResponse.json({ error: 'Error generando análisis' }, { status: 500 });
  }
}
