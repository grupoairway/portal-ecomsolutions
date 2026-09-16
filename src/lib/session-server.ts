import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { SESSION_COOKIE, verifySession, type SessionData } from './session';

/**
 * Sesión verificada para server components y route handlers que usan cookies().
 * Devuelve null si no hay sesión válida.
 */
export async function getSession(): Promise<SessionData | null> {
  return verifySession(cookies().get(SESSION_COOKIE)?.value);
}

/**
 * Igual que getSession(), pero manda al acceso si no hay sesión válida.
 * Para páginas dentro de /dashboard.
 */
export async function requireSession(): Promise<SessionData> {
  const session = await getSession();
  if (!session) redirect('/');
  return session;
}
