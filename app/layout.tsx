import type { Metadata } from "next";
import { Geist_Mono, Manrope, Noto_Serif_Display } from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { ScrollToTopOnNavigate } from "@/components/layout/scroll-to-top-on-navigate";
import { LocaleProvider } from "@/lib/i18n/locale-context";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { ClerkLocalizedProvider } from "@/components/providers/clerk-localized-provider";
import { HOME_DESCRIPTION, HOME_TITLE, SITE_KEYWORDS, SITE_NAME, SITE_URL, jsonLdHtml } from "@/lib/seo";
import "./globals.css";

// Typography: Manrope for all running text and UI, Noto Serif Display for the
// big "cinematic" type — page / section / movie titles, taglines and card
// titles (the `font-display` utility, see globals.css). Both have Cyrillic
// and Greek, so bg / el read in the real faces, not a system fallback.
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin", "cyrillic", "greek"],
});

const notoSerifDisplay = Noto_Serif_Display({
  variable: "--font-noto-serif-display",
  subsets: ["latin", "cyrillic", "greek"],
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: HOME_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: HOME_DESCRIPTION,
  keywords: SITE_KEYWORDS,
  applicationName: SITE_NAME,
  category: "entertainment",
  // Search Console ownership, if verified via the HTML-tag method (DNS
  // verification in Cloudflare needs nothing here).
  verification: process.env.GOOGLE_SITE_VERIFICATION
    ? { google: process.env.GOOGLE_SITE_VERIFICATION }
    : undefined,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "bg_BG",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
  },
};

/**
 * Tells Google the site's name ("AuroraFlix" instead of the bare domain
 * above results) and who runs it.
 */
const SITE_JSON_LD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      url: SITE_URL,
      name: SITE_NAME,
      alternateName: ["Aurora Flix", "auroraflix.cloud"],
      description: HOME_DESCRIPTION,
      inLanguage: "bg-BG",
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.png`,
    },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  // Resolved server-side so it's baked into the very first render instead of
  // flipped in after the fact (see LocaleProvider's own comment): the saved
  // choice, else by the visitor's country — see getRequestLocale. Crawlers
  // always get Bulgarian, the language the site is indexed in.
  const initialLocale = await getRequestLocale();

  return (
    <html
      lang={initialLocale}
      className={`${manrope.variable} ${notoSerifDisplay.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background pt-16 pb-24 text-foreground md:pb-0">
        <script type="application/ld+json" dangerouslySetInnerHTML={jsonLdHtml(SITE_JSON_LD)} />
        <LocaleProvider initialLocale={initialLocale}>
          <ClerkLocalizedProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
            <ScrollToTopOnNavigate />
            <SiteHeader />
            {/* isolate: everything a page renders shares one stacking layer, so
                no z-index inside a page (hover previews, carousel arrows, the
                details banner) can ever paint over the fixed header. Overlays
                that must cover the header portal to <body> instead. */}
            <div className="relative isolate flex flex-1 flex-col">{children}</div>
          </ClerkLocalizedProvider>
        </LocaleProvider>
      </body>
    </html>
  );
}
