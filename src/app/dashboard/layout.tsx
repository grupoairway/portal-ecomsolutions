import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { decodeSession } from '@/lib/session';
import DashboardNav from '@/components/DashboardNav';
import styles from './dashboard.module.css';

async function logout() {
  'use server';
  cookies().delete('portal_session');
  redirect('/');
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const sessionCookie = cookies().get('portal_session');
  if (!sessionCookie) redirect('/');
  const session = decodeSession(sessionCookie.value);
  if (!session) redirect('/');

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <div className={styles.headerLogo}>
            <img
              src="/logo.png"
              alt=""
              style={{ width: '40px', height: '40px', objectFit: 'contain', background: 'transparent' }}
            />
            <span style={{ fontFamily: 'Inter, sans-serif', fontSize: '1.1rem', fontWeight: 700, color: '#0f172a' }}>
              Ecom<span style={{ color: '#2563eb' }}>Solutions</span>
            </span>
          </div>

          <div className={styles.headerRight}>
            <div className={styles.headerUser}>
              <span className={styles.headerNombre}>Hola, {session.nombre}</span>
              <span className={styles.badgeAcceso}>Último acceso: hoy</span>
            </div>
            <form action={logout}>
              <button type="submit" className={styles.btnLogout}>
                Cerrar sesión
              </button>
            </form>
          </div>
        </div>

        <nav className={styles.nav}>
          <div className={styles.navInner}>
            <DashboardNav />
          </div>
        </nav>
      </header>

      <main className={styles.layoutMain}>
        {children}
      </main>
    </div>
  );
}
