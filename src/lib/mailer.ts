import nodemailer from 'nodemailer'
import { asuntoGestor } from './cliente-prueba'
import { euros } from './fechas'

function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.hostinger.com',
    port: 465,
    secure: true,
    auth: {
      user: 'noreply@ecomsolutions.es',
      pass: process.env.SMTP_PASSWORD,
    },
  })
}

export async function sendMagicLink(to: string, nombre: string, magicUrl: string) {
  const transporter = createTransporter()
  const result = await transporter.sendMail({
    from: 'EcomSolutions <noreply@ecomsolutions.es>',
    to,
    subject: 'Tu enlace de acceso a EcomSolutions',
    html: `
      <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px; background: #ffffff;">
        <div style="text-align: center; margin-bottom: 32px;">
          <span style="font-size: 1.4rem; font-weight: 800; color: #0f172a;">Ecom<span style="color: #2563eb;">Solutions</span></span>
        </div>
        <h2 style="color: #0f172a; font-size: 1.3rem; margin-bottom: 8px;">Hola, ${nombre} 👋</h2>
        <p style="color: #6b7280; line-height: 1.6;">Haz clic en el botón para acceder a tu portal de gestoría:</p>
        <div style="text-align: center; margin: 32px 0;">
          <a href="${magicUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 1rem;">
            Acceder a mi portal →
          </a>
        </div>
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">Este enlace caduca en 24 horas.</p>
        <p style="color: #9ca3af; font-size: 13px; text-align: center;">Si no has solicitado este acceso, ignora este email.</p>
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
        <p style="color: #9ca3af; font-size: 12px; text-align: center;">EcomSolutions · info@ecomsolutions.es · +34 661 959 962</p>
      </div>
    `,
  })
  return result
}

interface ConfirmacionParams {
  clienteNombre: string;
  /** Sirve para marcar con [PRUEBA] los avisos del cliente de pruebas. */
  clienteEmail?: string;
  modeloNombre: string;
  periodo: string;
  accionLabel: string;
  gestorEmail?: string;
  iban?: string;
  motivo?: string;
  /** Datos del aplazamiento, cuando el cliente ha pedido pagar a plazos. */
  aplazamiento?: {
    cuotas: number;
    /** "Octubre 2026". */
    primeraCuota: string;
    motivo: string;
  };
}

export async function sendConfirmacionGestor(params: ConfirmacionParams) {
  const { clienteNombre, clienteEmail, modeloNombre, periodo, accionLabel, gestorEmail, iban, motivo, aplazamiento } = params
  const to = gestorEmail || 'info@ecomsolutions.es'
  const transporter = createTransporter()

  console.log('=== CONFIRMAR MODELO - sendConfirmacionGestor ===')
  console.log('SMTP_PASSWORD exists:', !!process.env.SMTP_PASSWORD)
  console.log('Enviando email a:', to)
  console.log('Subject:', asuntoGestor(`[Portal EcomSolutions] ✅ ${clienteNombre} ha confirmado ${modeloNombre} · ${periodo}`, { nombre: clienteNombre, email: clienteEmail }))

  const result = await transporter.sendMail({
    from: 'EcomSolutions <noreply@ecomsolutions.es>',
    to,
    subject: asuntoGestor(`[Portal EcomSolutions] ✅ ${clienteNombre} ha confirmado ${modeloNombre} · ${periodo}`, { nombre: clienteNombre, email: clienteEmail }),
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#0f172a;margin-bottom:20px;">✅ Confirmación de modelo fiscal</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:120px;">Cliente</td><td style="padding:8px 0;font-weight:600;">${clienteNombre}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Modelo</td><td style="padding:8px 0;font-weight:600;">${modeloNombre}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Período</td><td style="padding:8px 0;font-weight:600;">${periodo}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Acción</td><td style="padding:8px 0;font-weight:600;">${accionLabel}</td></tr>
          ${iban ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">IBAN</td><td style="padding:8px 0;font-weight:600;">${iban}</td></tr>` : ''}
          ${aplazamiento ? `
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Cuotas</td><td style="padding:8px 0;font-weight:600;">${aplazamiento.cuotas}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Primera cuota</td><td style="padding:8px 0;font-weight:600;">${aplazamiento.primeraCuota}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;vertical-align:top;">Motivo del aplazamiento</td><td style="padding:8px 0;">${aplazamiento.motivo}</td></tr>` : ''}
          ${motivo ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Comentario</td><td style="padding:8px 0;font-weight:600;">${motivo}</td></tr>` : ''}
        </table>
        ${aplazamiento ? '<p style="color:#6b7280;font-size:13px;margin-top:20px;">Hay que solicitar el aplazamiento en la sede de la AEAT al presentar el modelo.</p>' : ''}
      </div>
    `,
  })

  console.log('Email enviado correctamente. MessageId:', result.messageId)
  return result
}

interface DocumentacionClienteParams {
  clienteNombre: string;
  clienteEmail: string;
  tipoDocumento: string;
  periodo: string;
  descripcion?: string;
  archivos: Array<{ filename: string; content: Buffer; contentType: string }>;
}

export async function sendDocumentacionCliente(params: DocumentacionClienteParams) {
  const { clienteNombre, clienteEmail, tipoDocumento, periodo, descripcion, archivos } = params;
  const transporter = createTransporter();

  const result = await transporter.sendMail({
    from: 'EcomSolutions <noreply@ecomsolutions.es>',
    to: 'grupoairway@gmail.com',
    subject: asuntoGestor(`[Portal EcomSolutions] 📎 ${clienteNombre} ha subido documentación · ${tipoDocumento} · ${periodo}`, { nombre: clienteNombre, email: clienteEmail }),
    html: `
      <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#0f172a;margin-bottom:20px;">📎 Nueva documentación recibida</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;width:140px;">Cliente</td><td style="padding:8px 0;font-weight:600;">${clienteNombre}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Email</td><td style="padding:8px 0;">${clienteEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Tipo de doc.</td><td style="padding:8px 0;font-weight:600;">${tipoDocumento}</td></tr>
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Período</td><td style="padding:8px 0;font-weight:600;">${periodo}</td></tr>
          ${descripcion ? `<tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Descripción</td><td style="padding:8px 0;">${descripcion}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#6b7280;font-size:14px;">Archivos</td><td style="padding:8px 0;">${archivos.map(a => a.filename).join(', ')}</td></tr>
        </table>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
        <p style="color:#9ca3af;font-size:12px;">EcomSolutions · info@ecomsolutions.es</p>
      </div>
    `,
    attachments: archivos.map(a => ({
      filename: a.filename,
      content: a.content,
      contentType: a.contentType,
    })),
  });

  return result;
}

interface InvitacionQuantumParams {
  clienteNombre: string;
  clienteEmail: string;
}

/**
 * Aviso al gestor de que el cliente ha perdido su acceso a Quantum y quiere
 * que le reenvíen la invitación. El portal no habla con Quantum: solo avisa.
 */
export async function sendInvitacionQuantum(params: InvitacionQuantumParams) {
  const { clienteNombre, clienteEmail } = params
  const transporter = createTransporter()

  const result = await transporter.sendMail({
    from: 'EcomSolutions <noreply@ecomsolutions.es>',
    to: 'info@ecomsolutions.es',
    replyTo: clienteEmail,
    subject: asuntoGestor(`Reenviar invitación Quantum – ${clienteNombre}`, {
      nombre: clienteNombre,
      email: clienteEmail,
    }),
    html: `
      <div style="font-family:Figtree,Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#16212c;margin-bottom:20px;">Reenviar invitación a Quantum</h2>
        <p style="color:#5e6e7e;">Este cliente ha pedido desde el portal que le reenviéis su invitación de acceso a Quantum.</p>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;width:120px;">Cliente</td><td style="padding:8px 0;font-weight:600;">${clienteNombre}</td></tr>
          <tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;">Correo</td><td style="padding:8px 0;font-weight:600;">${clienteEmail}</td></tr>
        </table>
        <p style="color:#5e6e7e;font-size:13px;margin-top:20px;">Le hemos dicho que la recibirá en 24 horas.</p>
      </div>
    `,
  })

  console.log('Invitación Quantum solicitada. MessageId:', result.messageId)
  return result
}

interface PagoParams {
  clienteNombre: string;
  clienteEmail: string;
  modeloNombre: string;
  periodo: string;
  nrc: string;
  importe: number | null;
}

/**
 * Aviso al gestor de que el cliente ya ha pagado y nos ha dado el NRC. Sin él
 * no se puede presentar el modelo, así que conviene que llegue rápido.
 */
export async function sendPagoGestor(params: PagoParams) {
  const { clienteNombre, clienteEmail, modeloNombre, periodo, nrc, importe } = params
  const transporter = createTransporter()

  const result = await transporter.sendMail({
    from: 'EcomSolutions <noreply@ecomsolutions.es>',
    to: 'info@ecomsolutions.es',
    replyTo: clienteEmail,
    subject: asuntoGestor(
      `[Portal EcomSolutions] 💶 ${clienteNombre} ha pagado ${modeloNombre} · ${periodo}`,
      { nombre: clienteNombre, email: clienteEmail },
    ),
    html: `
      <div style="font-family:Figtree,Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#16212c;margin-bottom:20px;">💶 NRC recibido: ya se puede presentar</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;width:120px;">Cliente</td><td style="padding:8px 0;font-weight:600;">${clienteNombre}</td></tr>
          <tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;">Modelo</td><td style="padding:8px 0;font-weight:600;">${modeloNombre}</td></tr>
          <tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;">Período</td><td style="padding:8px 0;font-weight:600;">${periodo}</td></tr>
          ${importe != null ? `<tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;">Importe</td><td style="padding:8px 0;font-weight:600;">${euros(importe)}</td></tr>` : ''}
          <tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;">NRC</td><td style="padding:8px 0;font-weight:600;font-family:monospace;">${nrc}</td></tr>
        </table>
      </div>
    `,
  })

  console.log('Aviso de pago enviado. MessageId:', result.messageId)
  return result
}

interface CierreParams {
  clienteNombre: string;
  clienteEmail: string;
  /** "Agosto 2026". */
  periodo: string;
  tipo: 'Confirmado' | 'Sin movimientos';
  observaciones?: string | null;
  /** true si el cliente se ha puesto al día fuera de plazo. */
  fueraDePlazo?: boolean;
}

/**
 * Aviso al gestor de que el cliente ha cerrado la documentación de un mes: ya
 * se puede contabilizar. "Sin movimientos" también hay que saberlo, porque si
 * no el mes se quedaría esperando papeles que no van a llegar.
 */
export async function sendCierreGestor(params: CierreParams) {
  const { clienteNombre, clienteEmail, periodo, tipo, observaciones, fueraDePlazo } = params
  const transporter = createTransporter()

  const sinMovimientos = tipo === 'Sin movimientos'
  const titulo = sinMovimientos
    ? 'Mes sin movimientos'
    : 'Documentación del mes confirmada'

  const result = await transporter.sendMail({
    from: 'EcomSolutions <noreply@ecomsolutions.es>',
    to: 'info@ecomsolutions.es',
    replyTo: clienteEmail,
    subject: asuntoGestor(
      `[Portal EcomSolutions] ${sinMovimientos ? '⭕' : '📗'} ${clienteNombre} · ${periodo} · ${tipo.toLowerCase()}`,
      { nombre: clienteNombre, email: clienteEmail },
    ),
    html: `
      <div style="font-family:Figtree,Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 20px;">
        <h2 style="color:#16212c;margin-bottom:20px;">${sinMovimientos ? '⭕' : '📗'} ${titulo}</h2>
        <table style="width:100%;border-collapse:collapse;">
          <tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;width:140px;">Cliente</td><td style="padding:8px 0;font-weight:600;">${clienteNombre}</td></tr>
          <tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;">Correo</td><td style="padding:8px 0;">${clienteEmail}</td></tr>
          <tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;">Mes</td><td style="padding:8px 0;font-weight:600;">${periodo}</td></tr>
          <tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;">Confirmación</td><td style="padding:8px 0;font-weight:600;">${tipo}${fueraDePlazo ? ' (fuera de plazo)' : ''}</td></tr>
          ${observaciones ? `<tr><td style="padding:8px 0;color:#5e6e7e;font-size:14px;vertical-align:top;">Observaciones</td><td style="padding:8px 0;">${observaciones}</td></tr>` : ''}
        </table>
        <p style="color:#5e6e7e;font-size:13px;margin-top:20px;">${sinMovimientos
          ? 'El cliente indica que este mes no ha tenido actividad.'
          : 'El cliente confirma que ya está todo subido a Quantum.'}</p>
      </div>
    `,
  })

  console.log('Aviso de cierre mensual enviado. MessageId:', result.messageId)
  return result
}
