import { NextRequest, NextResponse } from 'next/server';
import { decodeSession } from '@/lib/session';
import { sendDocumentacionCliente } from '@/lib/mailer';

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

export async function POST(request: NextRequest) {
  const sessionToken = request.cookies.get('portal_session')?.value;
  if (!sessionToken) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }
  const session = decodeSession(sessionToken);
  if (!session) {
    return NextResponse.json({ error: 'Sesión inválida' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'Error al procesar los archivos' }, { status: 400 });
  }

  const tipoDocumento = formData.get('tipoDocumento') as string | null;
  const periodo = formData.get('periodo') as string | null;
  const descripcion = (formData.get('descripcion') as string | null) ?? '';
  const archivosEntries = formData.getAll('archivos') as File[];

  if (!tipoDocumento || !periodo || archivosEntries.length === 0) {
    return NextResponse.json({ error: 'Faltan campos requeridos' }, { status: 400 });
  }

  for (const file of archivosEntries) {
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `El archivo "${file.name}" supera el límite de 10MB` },
        { status: 400 },
      );
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: `El formato del archivo "${file.name}" no está permitido` },
        { status: 400 },
      );
    }
  }

  const archivos = await Promise.all(
    archivosEntries.map(async (file) => ({
      filename: file.name,
      content: Buffer.from(await file.arrayBuffer()),
      contentType: file.type,
    })),
  );

  await sendDocumentacionCliente({
    clienteNombre: session.nombre || session.email,
    clienteEmail: session.email,
    tipoDocumento,
    periodo,
    descripcion: descripcion || undefined,
    archivos,
  });

  return NextResponse.json({ success: true });
}
