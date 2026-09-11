<div align="center">

# 🎬 AuroraFlix

**A full-featured streaming platform for movies & series - built with Next.js on the frontend and a fleet of Go microservices on the backend.**

[![Live Demo](https://img.shields.io/badge/Live_Demo-auroraflix.cloud-1f2937?style=for-the-badge&logo=googlechrome&logoColor=white)](https://auroraflix.cloud)

[![Next.js](https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white)](https://nextjs.org)
[![React](https://img.shields.io/badge/React_19-149ECA?style=flat-square&logo=react&logoColor=white)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Go](https://img.shields.io/badge/Go_microservices-00ADD8?style=flat-square&logo=go&logoColor=white)](https://go.dev)
[![Clerk](https://img.shields.io/badge/Clerk-6C47FF?style=flat-square&logo=clerk&logoColor=white)](https://clerk.com)
[![Stripe](https://img.shields.io/badge/Stripe-635BFF?style=flat-square&logo=stripe&logoColor=white)](https://stripe.com)
[![Gemini](https://img.shields.io/badge/Gemini_AI-8E75B2?style=flat-square&logo=googlegemini&logoColor=white)](https://ai.google.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Cloudflare Workers](https://img.shields.io/badge/Cloudflare_Workers-F38020?style=flat-square&logo=cloudflare&logoColor=white)](https://workers.cloudflare.com)

<br/>

<img src="public/github-images/linkedin-01.png" alt="AuroraFlix homepage hero" width="100%" />

</div>

<br/>

AuroraFlix is a complete streaming experience - a browsable catalog of movies and series, per-title pages with trailers, cast and image galleries, an in-house multi-mirror video player with burned-in subtitle overlays, watchlists and playlists, a friends system with live presence, an AI recommendation assistant, and paid subscriptions via Stripe. It's bilingual (🇧🇬 Bulgarian / 🇬🇧 English) and runs on a real backend - a set of Go microservices - rather than mocked data.

## ✨ Features

### 🏠 Discovery & Catalog
- 🎠 Home page with an auto-rotating hero carousel, a "continue watching" row, and trending/popular rails for movies and series
- 🔍 Full catalog with genre / year / sort filters and actor search, plus a live search dropdown with instant suggestions
- 🎭 Actor pages - bio, birthplace, popularity, and a "check for more titles" action pulling their latest work

<div align="center">
<table><tr>
<td width="50%"><img src="public/github-images/linkedin-09.png" alt="Movie catalog with filters" width="100%" /></td>
<td width="50%"><img src="public/github-images/linkedin-06.png" alt="Live search suggestions" width="100%" /></td>
</tr></table>
<img src="public/github-images/linkedin-17.png" alt="Actor detail page" width="100%" />
</div>

### 🎬 Title pages & playback
- 📄 Rich detail pages - synopsis, genres, TMDB rating ring, YouTube trailer embed, cast grid, and a still/poster image gallery
- ▶️ Custom video player with **3 selectable mirrors**, so playback survives a single source going down
- 💬 Burned-in subtitle overlay, synced independently of the embedded player via a hand-rolled VTT parser
- 📺 Full episode browser for series, with a "check for new episodes" action

<div align="center">
<table><tr>
<td width="50%"><img src="public/github-images/linkedin-13.png" alt="Movie detail hero" width="100%" /></td>
<td width="50%"><img src="public/github-images/linkedin-16.png" alt="Cast section" width="100%" /></td>
</tr></table>
<table><tr>
<td width="50%"><img src="public/github-images/linkedin-22.png" alt="Multi-mirror player selector" width="100%" /></td>
<td width="50%"><img src="public/github-images/linkedin-23.png" alt="Burned-in subtitle overlay" width="100%" /></td>
</tr></table>
</div>

### ❤️ Personal library
- 📌 Watchlist (up to 20 titles) and a like/favorites system
- 🗂️ Custom playlists - public or private, shareable with friends
- 💬 Comments on every title, with likes/dislikes and edit/delete on your own comments
- 🗳️ "Order a title" - request anything missing from the catalog and it gets added within seconds

<div align="center">
<table><tr>
<td width="50%"><img src="public/github-images/linkedin-27.png" alt="Watchlist page" width="100%" /></td>
<td width="50%"><img src="public/github-images/linkedin-28.png" alt="Playlists" width="100%" /></td>
</tr></table>
<img src="public/github-images/linkedin-24.png" alt="Comments section" width="100%" />
</div>

### 👥 Social & live presence
- 🤝 Friends system - search, send/accept requests, and browse a friend's shared playlists and liked titles
- 🔴 Real-time "friend is watching X" presence pushed over a **direct WebSocket** connection to the API gateway
- 🔔 Live notifications for friend requests and acceptances, delivered the same way

<div align="center">
<table><tr>
<td width="50%"><img src="public/github-images/linkedin-31.png" alt="Friends search and requests" width="100%" /></td>
<td width="50%"><img src="public/github-images/linkedin-33.png" alt="Friend profile with shared playlists" width="100%" /></td>
</tr></table>
</div>

### 🤖 AI Assistant
- 💬 A Gemini-powered chat assistant, scoped strictly to movies/series recommendations
- 🎯 Personalizes suggestions using your own likes/watchlist, then renders each recommended title as a rich inline card (poster, rating, genres, synopsis) resolved back against the real catalog

<div align="center">
<table><tr>
<td width="50%"><img src="public/github-images/linkedin-35.png" alt="AI assistant starting prompts" width="100%" /></td>
<td width="50%"><img src="public/github-images/linkedin-38.png" alt="AI assistant recommendation cards" width="100%" /></td>
</tr></table>
</div>

### 💳 Accounts & Subscriptions
- 🔐 Clerk authentication - email/password and Google sign-in, avatar upload, profile management
- 👑 Free / Pro pricing tiers (4K + HDR, ad-free, multi-device, unlimited watchlist) with **Stripe Checkout** for upgrades and a customer portal for managing the subscription

<div align="center">
<img src="public/github-images/linkedin-03.png" alt="Pricing plans" width="100%" />
<table><tr>
<td width="50%"><img src="public/github-images/linkedin-04.png" alt="Stripe checkout" width="100%" /></td>
<td width="50%"><img src="public/github-images/linkedin-40.png" alt="Account profile settings" width="100%" /></td>
</tr></table>
</div>

## 🧰 Tech Stack

| Layer | Technology |
|---|---|
| 🖼️ Framework | [Next.js 16](https://nextjs.org) (App Router) |
| 📘 Language | TypeScript, React 19 |
| 🎨 Styling | Tailwind CSS v4 |
| 🔐 Auth | [Clerk](https://clerk.com) - session verification done by hand per-route (`@clerk/backend`), since Cloudflare Workers can't run Next 16's Node-only `proxy.ts` |
| 🗄️ Backend | A fleet of **Go microservices** (`lumo-api-gateway`, `lumo-user-svc`, `lumo-payments-svc`, `lumo-movies-subtitles-taker-svc`), hosted on Render |
| 🎞️ Catalog data | [TMDB](https://www.themoviedb.org) |
| ▶️ Playback | Embedded multi-mirror players + a hand-rolled VTT subtitle overlay |
| 🖼️ Media/CDN | TMDB images, [Cloudinary](https://cloudinary.com), Clerk avatar CDN - `next/image` unoptimized (already pre-sized at the source) |
| 🔌 Realtime | Direct browser↔gateway WebSocket for friend requests & "friend is watching" presence |
| 🤖 AI | [Google Gemini](https://ai.google.dev) (`gemini-3.5-flash-lite`) via a lightweight REST wrapper |
| 💳 Payments | [Stripe](https://stripe.com) Checkout + customer portal |
| 🌍 i18n | Hand-rolled bg/en locale system (cookie + `Accept-Language` detection, resolved server-side) |
| ☁️ Deployment | Cloudflare Workers, via [`@opennextjs/cloudflare`](https://opennext.js.org/cloudflare) + Wrangler |

## 📁 Project Structure

```
app/
  api/               Same-origin proxy routes to the Go gateway (auth, payments, comments, friends, ...)
  movies/, series/    Catalog, search, genre & detail pages
  actors/            Actor detail pages
  account/, order/, playlists/, watchlist/, friends/   Feature pages
lib/                 Data fetching, hooks, i18n, Clerk auth helpers, config
components/          UI components, grouped by feature area (movies/details, friends, payments, ...)
types/               Shared TypeScript types (movie, series, actor, comment, episode, ...)
```

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- A [Clerk](https://clerk.com) application
- Access to the AuroraFlix backend gateway (or your own compatible API for local development)

### Setup

```bash
npm install
```

Create a `.env.local`:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Start the dev server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) 🎉

## ☁️ Deployment

AuroraFlix deploys to **Cloudflare Workers** via the OpenNext Cloudflare adapter:

```bash
npm run cf:preview   # build + local Workers preview
npm run cf:deploy     # build + deploy
```

## 📝 Notes

- 🎬 Catalog data comes from TMDB; new titles can also be pulled in on demand from the "Order a title" page.
- 🧪 Backend, payments and auth all talk to real services - nothing on the product surface is mocked.

</div>
