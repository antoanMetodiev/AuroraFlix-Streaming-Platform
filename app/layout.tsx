import type { Metadata } from "next";
import { cookies, headers } from "next/headers";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { ScrollToTopOnNavigate } from "@/components/layout/scroll-to-top-on-navigate";
import { LocaleProvider, LOCALE_COOKIE_NAME } from "@/lib/i18n/locale-context";
import type { Locale } from "@/lib/i18n/dictionary";
import { ClerkLocalizedProvider } from "@/components/providers/clerk-localized-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "AuroraFlix — Watch movies & series",
    template: "%s | AuroraFlix",
  },
  description:
    "Stream trending movies and series in 4K on AuroraFlix — trailers, ratings, cast details and a personal watchlist, all in one place.",
  openGraph: {
    type: "website",
    siteName: "AuroraFlix",
    title: "AuroraFlix — Watch movies & series",
    description:
      "Stream trending movies and series in 4K on AuroraFlix — trailers, ratings, cast details and a personal watchlist, all in one place.",
  },
  twitter: {
    card: "summary_large_image",
    title: "AuroraFlix — Watch movies & series",
    description:
      "Stream trending movies and series in 4K on AuroraFlix — trailers, ratings, cast details and a personal watchlist, all in one place.",
  },
};

// No saved preference yet — guess from the request's own Accept-Language
// header so a Bulgarian visitor lands on a Bulgarian site by default, same
// as the old client-side navigator.languages check used to, but resolved
// server-side so it's baked into the very first render instead of flipped
// in after the fact (see LocaleProvider's own comment for why that matters).
async function resolveInitialLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const saved = cookieStore.get(LOCALE_COOKIE_NAME)?.value;
  if (saved === "en" || saved === "bg") return saved;

  const headerStore = await headers();
  const acceptLanguage = headerStore.get("accept-language") ?? "";
  return acceptLanguage.toLowerCase().includes("bg") ? "bg" : "en";
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const initialLocale = await resolveInitialLocale();

  return (
    <html
      lang={initialLocale}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background pt-16 pb-24 text-foreground md:pb-0">
        <LocaleProvider initialLocale={initialLocale}>
          <ClerkLocalizedProvider>
            <ScrollToTopOnNavigate />
            <SiteHeader />
            {children}
          </ClerkLocalizedProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
