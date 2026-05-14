import { SignJWT, jwtVerify } from 'jose';

function getSecret(): Uint8Array {
  return new TextEncoder().encode(process.env.NEXTAUTH_SECRET!);
}

export async function generateMagicLinkToken(payload: {
  email: string;
  clienteId: string;
  nombre: string;
}): Promise<string> {
  return new SignJWT({ ...payload, type: 'magic_link' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(getSecret());
}

export async function generateSessionToken(payload: {
  clienteId: string;
  email: string;
  nombre: string;
}): Promise<string> {
  return new SignJWT({ ...payload, type: 'session' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(getSecret());
}

export async function verifyToken(token: string): Promise<{
  clienteId: string;
  email: string;
  nombre: string;
  type: string;
} | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return payload as {
      clienteId: string;
      email: string;
      nombre: string;
      type: string;
    };
  } catch {
    return null;
  }
}
