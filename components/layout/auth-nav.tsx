"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useUser } from "@/lib/auth";
import { useTranslation } from "@/lib/i18n/locale-context";

const AVATAR_SKELETON = "h-8 w-8 shrink-0 animate-pulse rounded-full bg-foreground/10";

// Clerk's menu only ever renders for a signed-in visitor, so its code loads only for them.
const UserMenu = dynamic(() => import("@/components/layout/user-menu"), {
  loading: () => <div className={AVATAR_SKELETON} />,
});

// Client-side (useUser, not the server-only <Show>) so this can be reused freely
// in both the desktop bar and the mobile dropdown, same as NavSearch/LanguageSelect.
export function AuthNav({ className = "" }: { className?: string }) {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useUser();
  const pathname = usePathname();

  if (!isLoaded) {
    return <div className={`${AVATAR_SKELETON} ${className}`} />;
  }

  if (isSignedIn) {
    return (
      <div className={className}>
        <UserMenu />
      </div>
    );
  }

  // Plain links to Clerk's own pages (not its modal buttons, which need Clerk
  // loaded on every page — see lib/auth). Back to this page afterwards.
  const back = encodeURIComponent(pathname);

  return (
    <div className={`flex items-center gap-1.5 ${className}`}>
      <Link
        href={`/sign-in?redirect_url=${back}`}
        className="rounded-full px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-foreground/70 transition-colors duration-300 hover:bg-foreground/10 hover:text-foreground"
      >
        {t("nav.signIn")}
      </Link>
      <Link
        href={`/sign-up?redirect_url=${back}`}
        className="rounded-full bg-white px-3.5 py-2 text-sm font-semibold whitespace-nowrap text-neutral-900 shadow-[0_4px_16px_-4px_rgba(255,255,255,0.55)] transition-transform duration-300 hover:-translate-y-0.5"
      >
        {t("nav.signUp")}
      </Link>
    </div>
  );
}
