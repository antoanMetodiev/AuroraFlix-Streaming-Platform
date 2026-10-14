import Image from "next/image";
import Link from "next/link";
import { HeaderIsland } from "@/components/layout/header-island";
import { Navigation } from "@/components/layout/navigation";
import { MobileTabBar } from "@/components/layout/mobile-tab-bar";
import { FriendsSocketManager } from "@/components/friends/friends-socket-manager";
import { WatchingToastManager } from "@/components/friends/watching-toast";
import { WatchingFriendsSidebar } from "@/components/friends/watching-sidebar";
import { WatchingFriendsMobilePill } from "@/components/friends/watching-friends-mobile-pill";

// Rendered once from the root layout so it's identical and always present
// across every route — home, list, detail, watchlist, order, actor pages alike.
export function SiteHeader() {
  return (
    <>
      <HeaderIsland>
        <Link href="/" className="group/logo flex shrink-0 items-center" aria-label="AuroraFlix">
          <Image
            src="/logo.webp"
            alt="AuroraFlix"
            width={40}
            height={40}
            priority
            className="h-9 w-9 object-contain transition-transform duration-500 ease-out group-hover/logo:scale-110 group-hover/logo:-rotate-6"
          />
        </Link>

        <Navigation />
      </HeaderIsland>

      {/* Fixed to the viewport, so it lives outside <header> but is still
          driven from here to keep all nav wiring in one place.
          FriendsSocketManager used to live inside Navigation instead — moved
          here (a plain, rarely-re-rendering wrapper) since Navigation's own
          re-renders (mobile menu toggling, etc.) were tearing the socket
          down and reconnecting it far more than intended, dropping whatever
          the server pushed during each gap. See use-friend-request-socket's
          getTokenRef doc comment for the other half of that same fix. */}
      <FriendsSocketManager />
      <MobileTabBar />
      <WatchingToastManager />
      <WatchingFriendsSidebar />
      <WatchingFriendsMobilePill />
    </>
  );
}
