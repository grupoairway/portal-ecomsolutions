export interface SessionData {
  clienteId: string;
  email: string;
  nombre: string;
  createdAt?: number;
}

export function decodeSession(value: string): SessionData | null {
  try {
    const data = JSON.parse(Buffer.from(value, 'base64').toString()) as SessionData;
    if (!data.clienteId || !data.email) return null;
    return data;
  } catch {
    return null;
  }
}
