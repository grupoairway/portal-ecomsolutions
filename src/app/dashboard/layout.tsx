import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { requireSession } from '@/lib/session-server';
import { SESSION_COOKIE } from '@/lib/session';
import { getPerfilCliente } from '@/lib/notion';
import { borradoresPendientes, getVencimientos } from '@/lib/vencimientos';
import DashboardNav from '@/components/DashboardNav';
import styles from './shell.module.css';

async function logout() {
  'use server';
  cookies().delete(SESSION_COOKIE);
  redirect('/');
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireSession();

  const [perfil, vencimientos] = await Promise.all([
    getPerfilCliente(session.clienteId),
    getVencimientos(session.clienteId).catch(() => []),
  ]);

  const nombre =
    session.nombre && session.nombre !== 'Cliente'
      ? session.nombre
      : (perfil?.nombre ?? 'Cliente');

  return (
    <div className={styles.app}>
      <nav className={styles.side} aria-label="Secciones del portal">
        <div className={styles.logo}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="" className={styles.logoImg} />
          <span className={styles.logoText}>
            EcomSolutions
            <span>Portal del cliente</span>
          </span>
        </div>

        <DashboardNav
          borradoresPendientes={borradoresPendientes(vencimientos).length}
          quantumUrl={process.env.NEXT_PUBLIC_QUANTUM_URL ?? null}
        />

        <div className={styles.sideFooter}>
          <span className={styles.userName}>{nombre}</span>
          <span className={styles.userEmail}>{session.email}</span>
          <form action={logout}>
            <button type="submit" className={styles.btnLogout}>
              Cerrar sesión
            </button>
          </form>
        </div>
      </nav>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
