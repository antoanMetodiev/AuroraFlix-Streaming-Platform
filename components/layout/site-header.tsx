import Image from "next/image";
import Link from "next/link";
import { Navigation } from "@/components/layout/navigation";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { WatchingToastManager } from "@/components/friends/watching-toast";
import { WatchingFriendsSidebar } from "@/components/friends/watching-sidebar";
import { WatchingFriendsMobilePill } from "@/components/friends/watching-friends-mobile-pill";

// Rendered once from the root layout so it's identical and always present
// across every route — home, list, detail, watchlist, order, actor pages alike.
export function SiteHeader() {
  return (
    <>
      <header className="fixed inset-x-0 top-0 z-40 w-full border-b border-foreground/10 bg-background/40 backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-full max-w-[100rem] items-center gap-6 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex shrink-0 items-center" aria-label="AuroraFlix">
            <Image src="/logo.webp" alt="AuroraFlix" width={40} height={40} priority className="h-10 w-10 object-contain" />
          </Link>

          <Navigation />
        </div>
      </header>

      {/* Fixed to the viewport, so it lives outside <header> but is still
          driven from here to keep all nav wiring in one place. */}
      <MobileTabBar />
      <WatchingToastManager />
      <WatchingFriendsSidebar />
      <WatchingFriendsMobilePill />
    </>
  );
}
