'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DashboardNav.module.css';

interface NavItem {
  href: string;
  label: string;
  icon: string;
  exact: boolean;
  badge?: number;
}

interface Props {
  modelosPendientes?: number;
}

export default function DashboardNav({ modelosPendientes = 0 }: Props) {
  const pathname = usePathname();

  const NAV_ITEMS: NavItem[] = [
    { href: '/dashboard', label: 'Inicio', icon: '🏠', exact: true },
    { href: '/dashboard/balance', label: 'Balance', icon: '⚖️', exact: false },
    { href: '/dashboard/pyg', label: 'PyG', icon: '📈', exact: false },
    { href: '/dashboard/documentos', label: 'Documentos', icon: '📁', exact: false },
    {
      href: '/dashboard/modelos',
      label: 'Modelos',
      icon: '📋',
      exact: false,
      badge: modelosPendientes > 0 ? modelosPendientes : undefined,
    },
    { href: '/dashboard/consultas', label: 'Consultas', icon: '💬', exact: false },
  ];

  return (
    <>
      {NAV_ITEMS.map((item) => {
        const isActive = item.exact
          ? pathname === item.href
          : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span className={styles.label}>{item.label}</span>
            {item.badge != null && (
              <span className={styles.badge}>{item.badge}</span>
            )}
          </Link>
        );
      })}
    </>
  );
}
