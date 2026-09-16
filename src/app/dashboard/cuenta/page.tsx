import Link from 'next/link';
import { requireSession } from '@/lib/session-server';
import { getPerfilCliente } from '@/lib/notion';
import { euros, fechaLargaConAnio } from '@/lib/fechas';
import Chip, { type TonoChip } from '@/components/Chip';

export const dynamic = 'force-dynamic';

/** El plan se guarda con el precio ("Autónomo Pro 50€"); aquí va aparte. */
function nombrePlan(plan: string): string {
  return plan.replace(/\s*\d+\s*€\s*$/, '').trim();
}

function tonoEstado(estado: string): TonoChip {
  if (estado === 'Activo') return 'ok';
  if (estado === 'En riesgo') return 'warn';
  if (estado === 'Baja' || estado === 'Error') return 'alert';
  return 'neutral';
}

/**
 * Una fila solo se pinta si hay dato. Los campos de BD - Clientes que estén
 * vacíos no aparecen: no se inventa nada que no esté en Notion.
 */
function Fila({
  etiqueta,
  valor,
  derecha,
}: {
  etiqueta: string;
  valor: string | null | undefined;
  derecha?: React.ReactNode;
}) {
  if (!valor) return null;
  return (
    <div className="row">
      <div>
        {etiqueta}
        <small>{valor}</small>
      </div>
      {derecha}
    </div>
  );
}

export default async function CuentaPage() {
  const session = await requireSession();
  const perfil = await getPerfilCliente(session.clienteId);

  const nombre = perfil?.nombre || session.nombre;

  return (
    <>
      <h1 className="page-title">Mi cuenta</h1>
      <p className="lead">Tu servicio contratado y tus datos.</p>

      <div className="grid2">
        <section className="panel">
          <h2 className="panel-title">Servicio</h2>

          {/* Titular del servicio: el plan si lo hay y, si no, el tipo de
              relación. El estado va siempre como chip a la derecha. */}
          {(perfil?.plan || perfil?.tipoRelacion || perfil?.estado) && (
            <div className="row">
              <div>
                {perfil?.plan
                  ? nombrePlan(perfil.plan)
                  : (perfil?.tipoRelacion ?? 'Servicio de gestoría')}
                <small>
                  {perfil?.cuotaMensual != null
                    ? `${euros(perfil.cuotaMensual)} al mes`
                    : perfil?.plan
                      ? (perfil.tipoRelacion ?? 'Cuota mensual')
                      : 'Cuota mensual'}
                </small>
              </div>
              {perfil?.estado && (
                <Chip tono={tonoEstado(perfil.estado)}>{perfil.estado}</Chip>
              )}
            </div>
          )}
          <Fila
            etiqueta="Cliente desde"
            valor={
              perfil?.fechaAlta ? fechaLargaConAnio(perfil.fechaAlta) : null
            }
          />
          <Fila
            etiqueta="Certificado digital"
            valor={
              perfil?.certificadoDigital
                ? perfil.fechaCaducidadCertificado
                  ? `Caduca el ${fechaLargaConAnio(perfil.fechaCaducidadCertificado)}`
                  : 'Lo tenemos nosotros para presentar por ti'
                : null
            }
          />
        </section>

        <section className="panel">
          <h2 className="panel-title">Tus datos</h2>
          <Fila etiqueta="Nombre" valor={nombre} />
          <Fila etiqueta="NIF / CIF" valor={perfil?.nif} />
          <Fila etiqueta="Correo" valor={perfil?.email ?? session.email} />
          <Fila etiqueta="Teléfono" valor={perfil?.telefono} />
          <Fila etiqueta="Forma jurídica" valor={perfil?.tipoCliente} />
          <Fila etiqueta="Régimen de IVA" valor={perfil?.regimenIva} />
          <Fila
            etiqueta="Régimen de IRPF"
            valor={
              perfil?.regimenIrpf !== 'No aplica' ? perfil?.regimenIrpf : null
            }
          />
          <Fila etiqueta="Cuenta bancaria" valor={perfil?.iban} />

          <p style={{ marginTop: 14, color: 'var(--muted)', fontSize: 14 }}>
            ¿Hay algo que cambiar?{' '}
            <Link href="/dashboard/consultas" style={{ color: 'var(--brand)' }}>
              Dínoslo desde Consultas
            </Link>{' '}
            y lo actualizamos.
          </p>
        </section>
      </div>
    </>
  );
}
