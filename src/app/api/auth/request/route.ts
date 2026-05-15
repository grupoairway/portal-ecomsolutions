import { NextRequest, NextResponse } from 'next/server'
import { sendMagicLink } from '@/lib/mailer'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    console.log('=== MAGIC LINK REQUEST ===')
    console.log('Email recibido:', email)
    console.log('SMTP_PASSWORD exists:', !!process.env.SMTP_PASSWORD)
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

    // Token incluye nombre para la sesión
    const token = Buffer.from(
      JSON.stringify({ clienteId, email, nombre, exp: Date.now() + 86400000 })
    ).toString('base64')
    const magicUrl = `${process.env.BASE_URL}/auth/verify?token=${token}`
    console.log('Magic URL generada:', magicUrl.substring(0, 50) + '...')

    // Enviar email con SMTP Hostinger
    try {
      const result = await sendMagicLink(email, nombre, magicUrl)
      console.log('Email enviado correctamente. MessageId:', result.messageId)
    } catch (smtpError) {
      console.error('ERROR de SMTP:', smtpError)
      return NextResponse.json(
        { error: 'Error al enviar email', detail: String(smtpError) },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.log('ERROR GENERAL:', error)
    return NextResponse.json({ error: 'Error interno', detail: String(error) }, { status: 500 })
  }
}
