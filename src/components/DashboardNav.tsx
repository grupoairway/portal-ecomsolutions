'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import styles from './DashboardNav.module.css';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Inicio', icon: '🏠', exact: true },
  { href: '/dashboard/balance', label: 'Balance', icon: '⚖️', exact: false },
  { href: '/dashboard/pyg', label: 'PyG', icon: '📈', exact: false },
  { href: '/dashboard/documentos', label: 'Documentos', icon: '📁', exact: false },
];

export default function DashboardNav() {
  const pathname = usePathname();

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
          </Link>
        );
      })}
    </>
  );
}
