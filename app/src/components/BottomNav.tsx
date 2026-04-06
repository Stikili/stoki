"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  {
    href: "/dashboard", label: "Home",
    icon: (a: boolean) => <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1H4a1 1 0 01-1-1V9.5z" stroke={a?"#00C896":"#5A6B80"} strokeWidth="2" strokeLinejoin="round"/><path d="M9 21V12h6v9" stroke={a?"#00C896":"#5A6B80"} strokeWidth="2" strokeLinecap="round"/></svg>,
  },
  {
    href: "/inventory", label: "Stock",
    icon: (a: boolean) => <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="2" y="7" width="20" height="14" rx="2" stroke={a?"#00C896":"#5A6B80"} strokeWidth="2"/><path d="M16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2" stroke={a?"#00C896":"#5A6B80"} strokeWidth="2" strokeLinecap="round"/></svg>,
  },
  {
    href: "/sales", label: "Sell",
    icon: (a: boolean) => <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" stroke={a?"#00C896":"#5A6B80"} strokeWidth="2"/><path d="M12 8v8M8 12h8" stroke={a?"#00C896":"#5A6B80"} strokeWidth="2" strokeLinecap="round"/></svg>,
  },
  {
    href: "/credit", label: "Credit",
    icon: (a: boolean) => <svg width="22" height="22" fill="none" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2" stroke={a?"#00C896":"#5A6B80"} strokeWidth="2"/><path d="M2 10h20" stroke={a?"#00C896":"#5A6B80"} strokeWidth="2"/></svg>,
  },
  {
    href: "/advisor", label: "Stoki",
    icon: (a: boolean) => <svg width="22" height="22" viewBox="0 0 40 40" fill="none"><polyline points="5,27 12,19 18,23 24,12 35,16" stroke={a?"#00C896":"#5A6B80"} strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"/><circle cx="35" cy="16" r="2.5" fill={a?"#00C896":"#5A6B80"}/></svg>,
  },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{ background: '#0A0E17', borderTop: '1px solid #1E293B' }}>
      <div className="flex items-stretch max-w-lg mx-auto">
        {navItems.map(({ href, label, icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link key={href} href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-3">
              {icon(active)}
              <span className={`text-[11px] font-semibold ${active ? "text-brand" : "text-[#5A6B80]"}`}>
                {label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
