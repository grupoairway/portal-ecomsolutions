'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DashboardNav.module.css';

interface NavItem {
  href: string;
  label: string;
  exact: boolean;
  badge?: number;
  /** Etiqueta pequeña a la derecha, como "Quantum" en la maqueta. */
  ext?: string;
}

interface Props {
  /** Borradores esperando la conformidad del cliente. */
  borradoresPendientes?: number;
}

export default function DashboardNav({ borradoresPendientes = 0 }: Props) {
  const pathname = usePathname();

  // Mismo orden y mismos nombres que docs/maqueta-portal.html.
  const principales: NavItem[] = [
    { href: '/dashboard', label: 'Inicio', exact: true },
    { href: '/dashboard/calendario', label: 'Calendario fiscal', exact: false },
    {
      href: '/dashboard/borradores',
      label: 'Borradores y justificantes',
      exact: false,
      badge: borradoresPendientes > 0 ? borradoresPendientes : undefined,
    },
    { href: '/dashboard/documentos', label: 'Documentación', exact: false },
    { href: '/dashboard/notificaciones', label: 'Notificaciones', exact: false },
    { href: '/dashboard/consultas', label: 'Consultas', exact: false },
  ];

  const secundarias: NavItem[] = [
    {
      href: '/dashboard/contabilidad',
      label: 'Mi contabilidad',
      exact: false,
      ext: 'Quantum',
    },
    { href: '/dashboard/cuenta', label: 'Mi cuenta', exact: false },
  ];

  function render(item: NavItem) {
    const isActive = item.exact
      ? pathname === item.href
      : pathname.startsWith(item.href);

    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={isActive ? 'page' : undefined}
        className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
      >
        <span>{item.label}</span>
        {item.badge != null && <span className={styles.count}>{item.badge}</span>}
        {item.ext && <span className={styles.ext}>{item.ext}</span>}
      </Link>
    );
  }

  return (
    <>
      {principales.map(render)}
      <div className={styles.sep} />
      {secundarias.map(render)}
    </>
  );
}
