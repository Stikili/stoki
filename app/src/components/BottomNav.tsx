"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, CreditCard, Bell, Bot } from "lucide-react";

const leftItems = [
  { href: "/dashboard", label: "Home", Icon: Home },
  { href: "/inventory", label: "Stock", Icon: Package },
];

const rightItems = [
  { href: "/credit", label: "Credit", Icon: CreditCard },
  { href: "/alerts", label: "Alerts", Icon: Bell },
];

const ACTIVE = '#00C896';
const INACTIVE = '#7B8CA1';

export default function BottomNav() {
  const pathname = usePathname();
  const advisorActive = pathname.startsWith("/advisor");

  function NavItem({ href, label, Icon }: { href: string; label: string; Icon: typeof Home }) {
    const active = pathname.startsWith(href);
    const c = active ? ACTIVE : INACTIVE;
    return (
      <Link href={href} className="flex flex-1 flex-col items-center justify-center gap-1 py-3">
        <Icon size={24} strokeWidth={active ? 2.25 : 1.75} color={c} />
        <span className="text-[11px] font-semibold" style={{ color: c }}>{label}</span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'var(--background)', borderTop: '1px solid var(--card-border)' }}>
      <div className="flex items-stretch max-w-lg mx-auto relative">
        {leftItems.map(item => <NavItem key={item.href} {...item} />)}

        {/* Center — Stoki bot FAB */}
        <div className="flex flex-1 items-center justify-center">
          <Link href="/advisor" className="absolute -top-6 flex flex-col items-center">
            <div
              className="w-[56px] h-[56px] rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{
                background: advisorActive ? '#00C896' : 'var(--background)',
                border: `3px solid ${advisorActive ? '#00C896' : '#2D3B50'}`,
                boxShadow: advisorActive
                  ? '0 0 24px rgba(0,200,150,0.5)'
                  : '0 4px 16px rgba(0,0,0,0.4)',
              }}
            >
              <Bot size={28} strokeWidth={1.75} color={advisorActive ? 'white' : INACTIVE} />
            </div>
            <span className="text-[10px] font-bold mt-1" style={{ color: advisorActive ? ACTIVE : INACTIVE }}>Stoki</span>
          </Link>
        </div>

        {rightItems.map(item => <NavItem key={item.href} {...item} />)}
      </div>
    </nav>
  );
}
