import type { Metadata, Viewport } from "next";
import { DM_Sans, Space_Grotesk, Outfit } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/Toast";
import { I18nProvider } from "@/lib/i18n";
import { ThemeProvider } from "@/components/ThemeProvider";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";
import GlobalLoader from "@/components/GlobalLoader";
import StructuredData from "@/components/StructuredData";
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

const SITE_URL = "https://stokiapp.com"
const SITE_NAME = "Stoki"
const OG_DESCRIPTION = "The AI-powered business assistant for South African SMMEs. Sales, stock, credit book, VAT201, payroll, and an AI advisor grounded in the SA economy — one app, on WhatsApp or the web, even offline."

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // Route-level metadata can now do `title: "Pricing"` and get
    // "Pricing | stoki — Run your business." for free.
    default: "stoki — Run your business.",
    template: "%s | stoki",
  },
  description: OG_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: "Stoki", url: SITE_URL }],
  creator: "Stoki",
  publisher: "Stoki",
  keywords: [
    "SA SMME software", "small business South Africa", "AI business assistant",
    "spaza shop app", "POS South Africa", "credit book app",
    "VAT201 South Africa", "PAYE UIF SDL calculator",
    "WhatsApp business app SA", "offline POS load-shedding",
    "SARB rate SMME", "SARS deadlines small business",
    "Loyverse alternative", "Yoco alternative", "Xero alternative",
    "Sage alternative", "iKhokha alternative", "QuickBooks alternative",
    "Zoho Books alternative", "SimplePay alternative",
    "informal trader app", "spaza shop software",
  ],
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_ZA",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "stoki — The AI business assistant for South African SMMEs",
    description: OG_DESCRIPTION,
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 627,
        alt: "Stoki — The AI business assistant for South African businesses",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "stoki — The AI business assistant for South African SMMEs",
    description: OG_DESCRIPTION,
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  // Populate GOOGLE_SITE_VERIFICATION / BING_SITE_VERIFICATION in Vercel
  // env after claiming stokiapp.com in each provider's console. Absent
  // envs → keys omitted; verification block only rendered when at least
  // one provider is configured.
  ...(process.env.GOOGLE_SITE_VERIFICATION || process.env.BING_SITE_VERIFICATION
    ? {
        verification: {
          ...(process.env.GOOGLE_SITE_VERIFICATION
            ? { google: process.env.GOOGLE_SITE_VERIFICATION }
            : {}),
          // Bing (msvalidate.01) lives under `verification.other`. Same
          // slot works for Yandex if you ever add SA-diaspora reach.
          ...(process.env.BING_SITE_VERIFICATION
            ? { other: { 'msvalidate.01': process.env.BING_SITE_VERIFICATION } }
            : {}),
        },
      }
    : {}),
  icons: {
    icon: [
      { url: "/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: "/icons/icon-192.png",
  },
  category: "business",
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
        <StructuredData />
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
