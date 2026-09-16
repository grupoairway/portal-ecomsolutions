# Portal de cliente EcomSolutions

Portal para clientes de EcomSolutions (gestoría online). Next.js en Vercel, datos en Notion, automatizaciones en n8n.
Diseño de referencia para la reestructuración: docs/maqueta-portal.html

## Reparto de funciones
- Quantum Economics: facturación (VERI*FACTU), subida de facturas y contabilidad. El portal NO duplica datos contables; solo enlaza a Quantum.
- Portal: vencimientos, borradores y conformidad, justificantes, cierre mensual de documentación, notificaciones DEHú, consultas, cuenta.

## Reglas con Notion
- Los campos select se escriben como { select: { name: valor } }, nunca como rich_text.
- Las fechas se comparan extrayendo los 10 primeros caracteres (YYYY-MM-DD) para evitar desfases por UTC.
- Las conformidades y cierres mensuales guardan siempre fecha y hora: son prueba ante el cliente.

## Forma de trabajar
- Textos de la interfaz en español, claros y sin tecnicismos.
- Antes de cambios grandes, proponer un plan y esperar confirmación.
