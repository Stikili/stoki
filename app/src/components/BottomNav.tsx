"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Package, CreditCard, ShoppingBag } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import Logo from "@/components/Logo";

// Stoki sits at the centre as a raised FAB.
const navItems = [
  { href: "/dashboard", key: "nav.dashboard", Icon: Home },
  { href: "/credit", key: "nav.credit", Icon: CreditCard },
  { href: "/advisor", key: "nav.stoki", Icon: Logo, center: true as const },
  { href: "/sales", key: "nav.sales", Icon: ShoppingBag },
  { href: "/inventory", key: "nav.inventory", Icon: Package },
];

const ACTIVE = '#00C896';
const INACTIVE = '#7B8CA1';

export default function BottomNav({ unreadInsights = 0 }: { unreadInsights?: number }) {
  const pathname = usePathname();
  const { t } = useI18n();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: 'var(--background)',
        borderTop: '1px solid var(--card-border)',
      }}
    >
      <div className="flex items-stretch max-w-lg mx-auto">
        {navItems.map(({ href, key, Icon, center }) => {
          const active = pathname.startsWith(href);
          const c = active ? ACTIVE : INACTIVE;

          if (center) {
            return (
              <Link
                key={href}
                href={href}
                className="flex flex-1 flex-col items-center justify-end gap-1 pb-2 pt-1"
              >
                <div
                  className="w-14 h-14 rounded-full flex items-center justify-center -mt-7 shadow-lg ring-4 relative"
                  style={{
                    background: ACTIVE,
                    boxShadow: '0 6px 16px rgba(0, 200, 150, 0.35)',
                  }}
                >
                  <Icon size={28} color="white" />
                  {unreadInsights > 0 && (
                    <span
                      className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold"
                      style={{
                        background: '#EF4444',
                        color: 'white',
                        border: '2px solid var(--background)',
                      }}
                      aria-label={`${unreadInsights} new insight${unreadInsights === 1 ? '' : 's'}`}
                    >
                      {unreadInsights > 9 ? '9+' : unreadInsights}
                    </span>
                  )}
                </div>
                <span className="text-[10px] font-semibold mt-0.5" style={{ color: ACTIVE }}>
                  {t(key)}
                </span>
              </Link>
            );
          }

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-1 flex-col items-center justify-center gap-1 py-3"
            >
              <Icon size={24} strokeWidth={active ? 2.25 : 1.75} color={c} />
              <span className="text-[11px] font-semibold" style={{ color: c }}>
                {t(key)}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
