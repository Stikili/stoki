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

export default function BottomNav() {
  const pathname = usePathname();
  const advisorActive = pathname.startsWith("/advisor");

  function NavItem({ href, label, Icon }: { href: string; label: string; Icon: typeof Home }) {
    const active = pathname.startsWith(href);
    return (
      <Link href={href} className="flex flex-1 flex-col items-center justify-center gap-1 py-3">
        <Icon size={22} strokeWidth={active ? 2.5 : 1.75} color={active ? '#00C896' : 'var(--muted-dim)'} />
        <span className="text-[11px] font-semibold" style={{ color: active ? '#00C896' : 'var(--muted-dim)' }}>{label}</span>
      </Link>
    );
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50" style={{ background: 'var(--background)', borderTop: '1px solid var(--card-border)' }}>
      <div className="flex items-stretch max-w-lg mx-auto relative">
        {/* Left items */}
        {leftItems.map(item => <NavItem key={item.href} {...item} />)}

        {/* Center — Stoki bot FAB */}
        <div className="flex flex-1 items-center justify-center">
          <Link
            href="/advisor"
            className="absolute -top-5 flex flex-col items-center"
          >
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center transition-transform active:scale-95"
              style={{
                background: advisorActive ? '#00C896' : 'var(--card-bg)',
                border: advisorActive ? '3px solid #00C896' : '3px solid var(--card-border)',
                boxShadow: advisorActive
                  ? '0 0 20px rgba(0,200,150,0.4)'
                  : '0 4px 12px rgba(0,0,0,0.3)',
              }}
            >
              <Bot
                size={26}
                strokeWidth={1.75}
                color={advisorActive ? 'var(--btn-primary-text)' : 'var(--muted)'}
              />
            </div>
            <span className="text-[10px] font-semibold mt-1" style={{ color: advisorActive ? '#00C896' : 'var(--muted-dim)' }}>Stoki</span>
          </Link>
        </div>

        {/* Right items */}
        {rightItems.map(item => <NavItem key={item.href} {...item} />)}
      </div>
    </nav>
  );
}
