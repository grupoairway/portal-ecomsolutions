import { redirect } from 'next/navigation';
import styles from './verify.module.css';

export default function VerifyPage({
  searchParams,
}: {
  searchParams: { token?: string; error?: string };
}) {
  // La verificación real la hace la API route /api/auth/verify
  // Esta página actúa como fallback o muestra errores
  if (searchParams.token) {
    redirect(`/api/auth/verify?token=${searchParams.token}`);
  }

  return (
    <main className={styles.page}>
      <div className={styles.card}>
        <div className={styles.icon}>⚠️</div>
        <h1 className={styles.title}>Enlace inválido</h1>
        <p className={styles.text}>
          El enlace de acceso no es válido o ha caducado. Por favor, solicita uno nuevo.
        </p>
        <a href="/" className={styles.link}>
          Volver al inicio
        </a>
      </div>
    </main>
  );
}
