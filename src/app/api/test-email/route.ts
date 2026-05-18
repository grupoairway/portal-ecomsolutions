import { NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    console.log('TEST EMAIL - SMTP_PASSWORD exists:', !!process.env.SMTP_PASSWORD)

    const transporter = nodemailer.createTransport({
      host: 'smtp.hostinger.com',
      port: 465,
      secure: true,
      auth: {
        user: 'noreply@ecomsolutions.es',
        pass: process.env.SMTP_PASSWORD,
      },
    })

    const result = await transporter.sendMail({
      from: 'EcomSolutions <noreply@ecomsolutions.es>',
      to: 'info@ecomsolutions.es',
      subject: 'Test email portal',
      html: '<p>Test de email desde el portal</p>',
    })

    return NextResponse.json({
      success: true,
      messageId: result.messageId,
      smtp_password_exists: !!process.env.SMTP_PASSWORD,
    })
  } catch (error: unknown) {
    const e = error as Error
    return NextResponse.json({
      success: false,
      error: e.message,
      stack: e.stack,
    }, { status: 500 })
  }
}
