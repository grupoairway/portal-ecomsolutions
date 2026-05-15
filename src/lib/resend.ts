import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function enviarMagicLink(params: {
  email: string;
  nombre: string;
  token: string;
}): Promise<{ data: unknown; error: unknown }> {
  const url = `${process.env.BASE_URL}/auth/verify?token=${params.token}`;

  const html = `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Accede a tu portal - EcomSolutions</title>
</head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Inter,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;padding:40px 0;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
          <!-- Header -->
          <tr>
            <td style="background:#2563eb;padding:32px 40px;text-align:center;">
              <table cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td style="background:rgba(255,255,255,0.2);border-radius:10px;padding:10px;vertical-align:middle;">
                    <span style="font-size:24px;">📊</span>
                  </td>
                  <td style="padding-left:12px;vertical-align:middle;">
                    <span style="color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">EcomSolutions</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:40px;">
              <p style="margin:0 0 8px;color:#6b7280;font-size:14px;font-weight:500;text-transform:uppercase;letter-spacing:0.5px;">Portal de Gestoría</p>
              <h1 style="margin:0 0 24px;color:#111827;font-size:26px;font-weight:700;line-height:1.3;">Hola, ${params.nombre} 👋</h1>
              <p style="margin:0 0 32px;color:#374151;font-size:16px;line-height:1.6;">Haz clic en el botón para acceder a tu portal de gestoría. Este enlace es personal e intransferible.</p>
              <table cellpadding="0" cellspacing="0" style="margin:0 auto 32px;">
                <tr>
                  <td>
                    <a href="${url}" style="display:inline-block;background:#2563eb;color:#ffffff;font-size:16px;font-weight:600;text-decoration:none;padding:16px 36px;border-radius:8px;letter-spacing:0.2px;">
                      Acceder a mi portal →
                    </a>
                  </td>
                </tr>
              </table>
              <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
                <p style="margin:0;color:#1d4ed8;font-size:14px;">
                  ⏱️ <strong>Este enlace caduca en 24 horas.</strong>
                </p>
              </div>
              <p style="margin:0;color:#6b7280;font-size:14px;line-height:1.5;">Si no has solicitado este acceso, ignora este email. Tu cuenta está segura.</p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#f9fafb;border-top:1px solid #e5e7eb;padding:24px 40px;text-align:center;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:13px;font-weight:600;">EcomSolutions</p>
              <p style="margin:0;color:#9ca3af;font-size:12px;">info@ecomsolutions.es</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  return resend.emails.send({
    from: 'portal@ecomsolutions.es',
    to: params.email,
    subject: 'Tu enlace de acceso a EcomSolutions',
    html,
  });
}
