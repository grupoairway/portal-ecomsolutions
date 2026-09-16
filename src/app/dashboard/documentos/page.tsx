import { requireSession } from '@/lib/session-server';
import { getDocumentosCliente } from '@/lib/notion';
import { getCierresCliente } from '@/lib/cierres';
import CierreMensual from '@/components/CierreMensual';
import DocumentosTabs from '@/components/DocumentosTabs';

export default async function DocumentosPage() {
  const session = await requireSession();

  const [documentos, cierres] = await Promise.all([
    getDocumentosCliente(session.clienteId).catch(() => []),
    getCierresCliente(session.clienteId).catch(() => []),
  ]);

  const quantumUrl = process.env.NEXT_PUBLIC_QUANTUM_URL ?? null;

  return (
    <>
      <h1 className="page-title">Documentación</h1>
      <p className="lead">
        Las facturas y tickets se suben en Quantum. Aquí cierras cada mes y
        consultas los documentos que te hemos dejado.
      </p>

      <CierreMensual cierres={cierres} quantumUrl={quantumUrl} />

      {/*
        La subida de archivos queda por debajo del cierre mensual y como
        opción secundaria: es para lo que no cabe en Quantum (contratos,
        escrituras, un requerimiento), no para las facturas del día a día.
      */}
      <section className="panel">
        <h2 className="panel-title">Tus documentos y otros envíos</h2>
        <p style={{ margin: '0 0 14px', color: 'var(--muted)', lineHeight: 1.5 }}>
          Aquí tienes lo que te hemos dejado y, si necesitas mandarnos algo que
          no va en Quantum —un contrato, una escritura, una carta de Hacienda—,
          puedes adjuntarlo. Las facturas, en Quantum.
        </p>
        <DocumentosTabs documentos={documentos} />
      </section>
    </>
  );
}
