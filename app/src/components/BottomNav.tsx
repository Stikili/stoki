"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, Bot, CreditCard, ShoppingBag } from "lucide-react";
import { useI18n } from "@/lib/i18n";

const navItems = [
  { href: "/dashboard", key: "nav.dashboard", Icon: Home },
  { href: "/credit", key: "nav.credit", Icon: CreditCard },
  { href: "/sales", key: "nav.sales", Icon: ShoppingBag },
  { href: "/inventory", key: "nav.inventory", Icon: Package },
  { href: "/advisor", key: "nav.alerts", Icon: Bot },
];

const ACTIVE = '#00C896';
const INACTIVE = '#7B8CA1';

export default function BottomNav() {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'var(--background)', borderTop: '1px solid var(--card-border)' }}>
      <div className="flex items-stretch max-w-lg mx-auto">
        {navItems.map(({ href, key, Icon }) => {
          const active = pathname.startsWith(href);
          const c = active ? ACTIVE : INACTIVE;
          return (
            <Link key={href} href={href} className="flex flex-1 flex-col items-center justify-center gap-1 py-3">
              <Icon size={24} strokeWidth={active ? 2.25 : 1.75} color={c} />
              <span className="text-[11px] font-semibold" style={{ color: c }}>{t(key)}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
