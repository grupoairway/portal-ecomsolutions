import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  host: 'smtp.hostinger.com',
  port: 465,
  secure: true,
  auth: {
    user: 'noreply@ecomsolutions.es',
    pass: process.env.SMTP_PASSWORD,
  },
})

export async function sendMagicLink(to: string, nombre: string, magicUrl: string) {
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
    `
  })
  return result
}
