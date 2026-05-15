import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    console.log('=== MAGIC LINK REQUEST ===')
    console.log('Email recibido:', email)
    console.log('RESEND_KEY exists:', !!process.env.RESEND_API_KEY)
    console.log('RESEND_KEY prefix:', process.env.RESEND_API_KEY?.substring(0, 8))
    console.log('BASE_URL:', process.env.BASE_URL)
    console.log('NOTION_TOKEN exists:', !!process.env.NOTION_TOKEN)
    console.log('NOTION_CLIENTES_DB:', process.env.NOTION_CLIENTES_DB)

    if (!email) {
      return NextResponse.json({ error: 'Email requerido' }, { status: 400 })
    }

    // Buscar cliente en Notion
    const notionRes = await fetch(`https://api.notion.com/v1/databases/${process.env.NOTION_CLIENTES_DB}/query`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NOTION_TOKEN}`,
        'Content-Type': 'application/json',
        'Notion-Version': '2022-06-28',
      },
      body: JSON.stringify({
        filter: { property: 'Email', email: { equals: email } }
      })
    })

    const notionData = await notionRes.json()
    console.log('Notion status:', notionRes.status)
    console.log('Notion results count:', notionData.results?.length)

    if (!notionData.results || notionData.results.length === 0) {
      console.log('Cliente NO encontrado en Notion')
      return NextResponse.json({ error: 'Email no encontrado' }, { status: 404 })
    }

    const cliente = notionData.results[0]
    const clienteId = cliente.id
    const nombre = cliente.properties?.Nombre?.title?.[0]?.plain_text || 'Cliente'
    console.log('Cliente encontrado:', nombre, clienteId)

    // Generar token simple
    const token = Buffer.from(JSON.stringify({ clienteId, email, exp: Date.now() + 86400000 })).toString('base64')
    const magicUrl = `${process.env.BASE_URL}/auth/verify?token=${token}`
    console.log('Magic URL generada:', magicUrl.substring(0, 50) + '...')

    // Enviar email con Resend
    const resend = new Resend(process.env.RESEND_API_KEY)
    const emailResult = await resend.emails.send({
      from: 'EcomSolutions <portal@ecomsolutions.es>',
      to: email,
      subject: 'Tu enlace de acceso a EcomSolutions',
      html: `
        <div style="font-family: Inter, sans-serif; max-width: 500px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #0f172a;">Hola, ${nombre}</h2>
          <p style="color: #6b7280;">Haz clic en el botón para acceder a tu portal de gestoría:</p>
          <a href="${magicUrl}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin: 20px 0;">
            Acceder a mi portal →
          </a>
          <p style="color: #9ca3af; font-size: 14px;">Este enlace caduca en 24 horas.</p>
          <p style="color: #9ca3af; font-size: 14px;">Si no has solicitado este acceso, ignora este email.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 30px 0;">
          <p style="color: #9ca3af; font-size: 12px;">EcomSolutions · info@ecomsolutions.es</p>
        </div>
      `
    })

    console.log('Resend result:', JSON.stringify(emailResult))

    if (emailResult.error) {
      console.log('ERROR de Resend:', JSON.stringify(emailResult.error))
      return NextResponse.json({ error: 'Error al enviar email', detail: emailResult.error }, { status: 500 })
    }

    console.log('Email enviado correctamente, ID:', emailResult.data?.id)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.log('ERROR GENERAL:', error)
    return NextResponse.json({ error: 'Error interno', detail: String(error) }, { status: 500 })
  }
}
