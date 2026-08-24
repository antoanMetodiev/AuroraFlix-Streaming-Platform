export type ExtensionInstallTarget =
  | { store: "chrome"; url: string }
  | { store: "firefox"; url: string }
  | { store: "appstore"; url: string }
  | { store: "brave"; url: string }
  | { store: "unsupported"; url: null };

const CHROME_WEB_STORE_URL = "https://chromewebstore.google.com/detail/ublock-origin-lite/ddkjiahejlhfcafbddmgiahcphecmpfh";
const FIREFOX_DESKTOP_URL = "https://addons.mozilla.org/en-US/firefox/addon/ublock-origin/";
const FIREFOX_ANDROID_URL = "https://addons.mozilla.org/en-US/android/addon/ublock-origin/";
const SAFARI_APP_STORE_URL = "https://apps.apple.com/us/app/ublock-origin-lite/id6745342698";
const BRAVE_ANDROID_PLAY_STORE_URL = "https://play.google.com/store/apps/details?id=com.brave.browser";

/**
 * Figures out which store (if any) can actually install an ad blocker for the
 * browser/device this is running on, so the prompt never points someone at a
 * link that can't do anything for them there:
 *  - iOS/iPadOS: every browser is WebKit under the hood (Apple requires it,
 *    "Chrome" and "Firefox" there are just a shell around the same engine),
 *    so the only real path is Safari's own Content Blocker extension system,
 *    distributed through the App Store — never a Chrome/Firefox link.
 *  - Android + Firefox: Firefox for Android does support extensions,
 *    uBlock Origin included, via its own Android add-ons listing (a
 *    different URL than desktop Firefox's).
 *  - Android + anything else (Chrome, Samsung Internet, ...): none of these
 *    support browser extensions at all — this is most of our actual mobile
 *    traffic, so simply hiding the prompt here isn't good enough. Brave for
 *    Android blocks ads by default (its Shields feature) with no extension
 *    step required — just installing the app from the Play Store is the
 *    whole fix, on any Android device regardless of manufacturer.
 *  - Desktop Safari: dropped uBlock Origin support in 2019 when Apple
 *    overhauled its extension APIs; uBlock Origin Lite returned to Safari in
 *    2025 as an App Store app (still needs enabling under Safari's own
 *    Settings afterward — the App Store install alone doesn't turn it on).
 *  - Desktop Firefox: still runs the full uBlock Origin, through Mozilla's
 *    own add-ons store — a Chrome Web Store link is a dead end there.
 *  - Everything else (Chrome, Edge, Brave, Opera, Vivaldi, Arc, ...) is
 *    Chromium-based and installs the Chrome Web Store listing normally.
 */
export function getExtensionInstallTarget(): ExtensionInstallTarget {
  if (typeof navigator === "undefined") return { store: "unsupported", url: null };

  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (isIOS) return { store: "appstore", url: SAFARI_APP_STORE_URL };

  const isFirefox = /Firefox\//.test(ua);
  if (/Android/.test(ua)) {
    return isFirefox ? { store: "firefox", url: FIREFOX_ANDROID_URL } : { store: "brave", url: BRAVE_ANDROID_PLAY_STORE_URL };
  }

  const isChromiumFamily = /Chrome\/|Chromium\//.test(ua);
  const isDesktopSafari = /Safari\//.test(ua) && !isChromiumFamily && !isFirefox;
  if (isDesktopSafari) return { store: "appstore", url: SAFARI_APP_STORE_URL };
  if (isFirefox) return { store: "firefox", url: FIREFOX_DESKTOP_URL };

  return { store: "chrome", url: CHROME_WEB_STORE_URL };
}
