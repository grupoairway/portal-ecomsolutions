import { SignJWT, jwtVerify } from 'jose';

export const SESSION_COOKIE = 'portal_session';

/** 7 días, igual que la cookie anterior. */
export const SESSION_MAX_AGE = 60 * 60 * 24 * 7;

export interface SessionData {
  clienteId: string;
  email: string;
  nombre: string;
}

/**
 * Secreto de firma. SESSION_SECRET si existe; si no, NEXTAUTH_SECRET, que ya
 * está configurado en local y en Vercel.
 */
function getSecret(): Uint8Array {
  const secret = process.env.SESSION_SECRET ?? process.env.NEXTAUTH_SECRET;
  if (!secret) {
    throw new Error('Falta SESSION_SECRET (o NEXTAUTH_SECRET) para firmar la sesión');
  }
  return new TextEncoder().encode(secret);
}

/** Crea la cookie de sesión firmada. */
export async function createSessionToken(data: SessionData): Promise<string> {
  return new SignJWT({
    clienteId: data.clienteId,
    email: data.email,
    nombre: data.nombre,
    type: 'session',
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE}s`)
    .sign(getSecret());
}

/**
 * Verifica la firma y la caducidad de la cookie. Devuelve null si el token
 * falta, está manipulado, ha caducado o no es de tipo sesión.
 *
 * Es Edge-safe (solo jose), así que vale para el middleware y para el servidor.
 */
export async function verifySession(
  token: string | undefined | null,
): Promise<SessionData | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (payload.type !== 'session') return null;

    const { clienteId, email, nombre } = payload as {
      clienteId?: string;
      email?: string;
      nombre?: string;
    };
    if (!clienteId || !email) return null;

    return { clienteId, email, nombre: nombre || 'Cliente' };
  } catch {
    return null;
  }
}

/**
 * Opciones de la cookie. `secure` solo en producción: en desarrollo el portal
 * se sirve por http y el navegador descartaría una cookie Secure.
 */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: SESSION_MAX_AGE,
  };
}
