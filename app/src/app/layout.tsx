import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk, Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/components/ThemeProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import GlobalLoader from "@/components/GlobalLoader";
import { Analytics } from "@vercel/analytics/next";

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

// Used inside the .stoki-login scope (landing + login). Loaded via next/font
// rather than CSS @import so fonts are self-hosted, preconnected, and
// Tailwind v4's import-hoisting can't trip on order-of-rules.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  display: "swap",
});
const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "stoki — Run your business.",
  description: "The operating system for South African SMMEs. Stock, sales, credit book, and AI advisor in one app.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0D1B2A",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${dmSans.variable} ${spaceGrotesk.variable} ${outfit.variable} h-full`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('stoki_theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}` }} />
      </head>
      <body className="min-h-full flex flex-col antialiased" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <ThemeProvider>
          <I18nProvider>
            <ToastProvider>
              <ServiceWorkerRegister />
              <GlobalLoader />
              {children}
              {/* Vercel Web Analytics — page views, unique visitors, top
                  pages, referrers, geo. Zero-config beyond this import;
                  Vercel picks it up automatically on Pro tier deploys.
                  No cookies, GDPR/POPIA-friendly. Ignored on preview
                  deploys unless VERCEL_ENV=production. */}
              <Analytics />
            </ToastProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
