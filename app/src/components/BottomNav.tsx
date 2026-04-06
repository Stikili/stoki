"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, CirclePlus, CreditCard, TrendingUp } from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/inventory", label: "Stock", Icon: Package },
  { href: "/sales", label: "Sell", Icon: CirclePlus },
  { href: "/credit", label: "Credit", Icon: CreditCard },
  { href: "/advisor", label: "Stoki", Icon: TrendingUp },
];

export default function BottomNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'var(--background)', borderTop: '1px solid var(--card-border)' }}>
      <div className="flex items-stretch max-w-lg mx-auto">
        {navItems.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href} className="flex flex-1 flex-col items-center justify-center gap-1 py-3">
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} color={active ? '#00C896' : 'var(--muted-dim)'} />
              <span className="text-[11px] font-semibold" style={{ color: active ? '#00C896' : 'var(--muted-dim)' }}>{label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
