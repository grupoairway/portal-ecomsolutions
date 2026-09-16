import { requireSession } from '@/lib/session-server';

/**
 * Buzón DEHú. La lectura del buzón oficial y el volcado de cada notificación
 * llegan en la Fase 2; de momento la pantalla existe para que el cliente sepa
 * que lo vigilamos nosotros y no tenga que entrar él.
 */
export default async function NotificacionesPage() {
  await requireSession();

  return (
    <>
      <h1 className="page-title">Notificaciones</h1>
      <p className="lead">
        Revisamos cada día tu buzón oficial. Aquí tendrás cada carta con nuestra
        explicación.
      </p>

      <section className="panel">
        <h2 className="panel-title">Próximamente</h2>
        <p style={{ margin: 0, color: 'var(--muted)' }}>
          Estamos conectando el portal con tu buzón de notificaciones. Mientras
          tanto seguimos revisándolo nosotros cada día y te avisamos por correo
          en cuanto llegue algo que requiera tu atención.
        </p>
      </section>

      <div className="note">
        ¿Te ha llegado una carta en papel? Hazle una foto y envíanosla desde
        Consultas el mismo día: muchos plazos son de 10 días.
      </div>
    </>
  );
}
