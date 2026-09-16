'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DashboardNav.module.css';

interface NavItem {
  href: string;
  label: string;
  exact: boolean;
  badge?: number;
  /** Etiqueta pequeña a la derecha, p. ej. el nombre del programa externo. */
  ext?: string;
  external?: boolean;
}

interface Props {
  /** Borradores esperando la conformidad del cliente. */
  borradoresPendientes?: number;
  quantumUrl?: string | null;
}

export default function DashboardNav({
  borradoresPendientes = 0,
  quantumUrl,
}: Props) {
  const pathname = usePathname();

  const principales: NavItem[] = [
    { href: '/dashboard', label: 'Inicio', exact: true },
    {
      href: '/dashboard/borradores',
      label: 'Borradores y justificantes',
      exact: false,
      badge: borradoresPendientes > 0 ? borradoresPendientes : undefined,
    },
    { href: '/dashboard/documentos', label: 'Documentación', exact: false },
    { href: '/dashboard/consultas', label: 'Consultas', exact: false },
  ];

  const secundarias: NavItem[] = [
    { href: '/dashboard/balance', label: 'Balance', exact: false },
    { href: '/dashboard/pyg', label: 'Pérdidas y ganancias', exact: false },
    ...(quantumUrl
      ? [
          {
            href: quantumUrl,
            label: 'Mi contabilidad',
            exact: false,
            ext: 'Quantum',
            external: true,
          },
        ]
      : []),
  ];

  function render(item: NavItem) {
    if (item.external) {
      return (
        <a
          key={item.href}
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className={styles.item}
        >
          <span>{item.label}</span>
          <span className={styles.ext}>{item.ext}</span>
        </a>
      );
    }

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
