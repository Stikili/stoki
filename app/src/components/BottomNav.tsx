"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard",
    label: "Home",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75" strokeLinejoin="round"/>
        <path d="M9 21V12h6v9" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/inventory",
    label: "Stock",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <rect x="2" y="7" width="20" height="14" rx="2" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75"/>
        <path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75" strokeLinecap="round"/>
        <path d="M12 12v4M10 14h4" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href: "/sales",
    label: "Sell",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="9" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75"/>
        <path d="M12 8v8M9 10.5l3-2.5 3 2.5" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href: "/credit",
    label: "Credit",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <rect x="2" y="5" width="20" height="14" rx="2" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75"/>
        <path d="M2 10h20" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75"/>
        <circle cx="7" cy="15" r="1" fill={active ? "#00C896" : "#6b8299"}/>
      </svg>
    ),
  },
  {
    href: "/alerts",
    label: "Alerts",
    icon: (active: boolean) => (
      <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
        <path d="M12 2a7 7 0 00-7 7v4l-2 3h18l-2-3V9a7 7 0 00-7-7z" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75" strokeLinejoin="round"/>
        <path d="M10 19a2 2 0 004 0" stroke={active ? "#00C896" : "#6b8299"} strokeWidth="1.75" strokeLinecap="round"/>
      </svg>
    ),
  },
];

export default function BottomNav({ unreadAlerts = 0 }: { unreadAlerts?: number }) {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'rgba(8, 15, 26, 0.85)',
        backdropFilter: 'blur(24px)',
        WebkitBackdropFilter: 'blur(24px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        boxShadow: '0 -1px 0 0 rgba(255,255,255,0.04) inset',
      }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {navItems.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          const isAlerts = href === '/alerts';
          const showBadge = isAlerts && unreadAlerts > 0;
          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-3 transition-all relative"
            >
              <div className={`transition-all duration-200 relative ${active ? 'scale-110' : 'scale-100'}`}>
                {icon(active)}
                {showBadge && (
                  <div
                    className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full flex items-center justify-center text-[9px] font-bold px-1"
                    style={{ background: '#ef4444', color: 'white', boxShadow: '0 0 8px rgba(239,68,68,0.6)' }}
                  >
                    {unreadAlerts > 9 ? '9+' : unreadAlerts}
                  </div>
                )}
              </div>
              <span className={`text-[10px] font-semibold tracking-wide transition-colors ${active ? "text-brand" : "text-muted"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
