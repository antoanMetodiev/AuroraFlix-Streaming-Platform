"use client";

import { Footer } from "@/components/layout/footer";
import { useLocale } from "@/lib/i18n/locale-context";

const CONTACT_EMAIL = "antoan.0418@gmail.com";
const LAST_UPDATED = "27 август 2026";
const LAST_UPDATED_EN = "August 27, 2026";

function PrivacyBG() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Политика за поверителност</h1>
      <p className="mt-2 text-sm text-foreground/50">Последна актуализация: {LAST_UPDATED}</p>

      <div className="prose-sm mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/80">
        <p>
          AuroraFlix („ние“, „нас“) уважава поверителността ти. Този документ описва какви данни събираме, защо, и
          как ги ползваме, когато използваш auroraflix.cloud.
        </p>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. Какви данни събираме</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Данни за акаунта:</strong> имейл адрес, име и профилна снимка — при регистрация през email/парола
              или Google, обработени от нашия доставчик за автентикация (Clerk).
            </li>
            <li>
              <strong>Данни за плащане:</strong> при закупуване на абонамент, плащанията се обработват изцяло от Stripe
              — ние никога не виждаме и не съхраняваме данни за твоята карта.
            </li>
            <li>
              <strong>Данни за ползване:</strong> списък за гледане, оценки/харесвания, коментари, плейлисти, списък
              с приятели, и статус „в момента гледам“, ако ползваш тази функционалност.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. Как ползваме данните</h2>
          <p>
            Данните се ползват единствено за да предоставим услугата: показване на съдържание, управление на
            абонамента ти, и социалните функции (приятели), които изрично избереш да ползваш.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. Трети страни</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Clerk</strong> — автентикация и управление на потребителски акаунти.
            </li>
            <li>
              <strong>Stripe</strong> — обработка на плащания.
            </li>
            <li>
              <strong>The Movie Database (TMDB)</strong> — метаданни за филми/сериали (постери, описания, рейтинги).
            </li>
            <li>
              <strong>Cloudflare</strong> — хостинг и доставка на съдържанието.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. Бисквитки</h2>
          <p>
            Ползваме единствено технически необходими бисквитки/local storage за поддържане на сесията ти (вход) и
            локалните ти предпочитания (напр. избран език). Не ползваме рекламни или проследяващи трети-страна
            бисквитки.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">5. Твоите права</h2>
          <p>
            Можеш по всяко време да изтриеш акаунта си от настройките, което премахва профилните ти данни от нашата
            система. За въпроси относно достъп, корекция или изтриване на данни, пиши ни на имейла по-долу.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">6. Деца</h2>
          <p>Услугата не е насочена към лица под 16 години и съзнателно не събираме данни от такива лица.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">7. Промени в тази политика</h2>
          <p>Може да актуализираме този документ периодично. Промените влизат в сила от момента на публикуването им тук.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">8. Контакт</h2>
          <p>
            За въпроси относно тази политика, пиши ни на{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline underline-offset-2 hover:text-foreground/70">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}

function PrivacyEN() {
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">Privacy Policy</h1>
      <p className="mt-2 text-sm text-foreground/50">Last updated: {LAST_UPDATED_EN}</p>

      <div className="prose-sm mt-8 flex flex-col gap-6 text-sm leading-relaxed text-foreground/80">
        <p>
          AuroraFlix (“we”, “us”) respects your privacy. This document describes what data we collect, why, and how
          we use it when you use auroraflix.cloud.
        </p>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">1. What we collect</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Account data:</strong> email address, name, and profile picture — via email/password or Google
              sign-up, processed by our authentication provider (Clerk).
            </li>
            <li>
              <strong>Payment data:</strong> subscription payments are processed entirely by Stripe — we never see or
              store your card details.
            </li>
            <li>
              <strong>Usage data:</strong> watchlist, ratings/likes, comments, playlists, friends list, and “currently
              watching” status if you use that feature.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">2. How we use it</h2>
          <p>
            Data is used solely to provide the service: displaying content, managing your subscription, and the
            social features (friends) you explicitly opt into.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">3. Third parties</h2>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              <strong>Clerk</strong> — authentication and account management.
            </li>
            <li>
              <strong>Stripe</strong> — payment processing.
            </li>
            <li>
              <strong>The Movie Database (TMDB)</strong> — movie/series metadata (posters, descriptions, ratings).
            </li>
            <li>
              <strong>Cloudflare</strong> — hosting and content delivery.
            </li>
          </ul>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">4. Cookies</h2>
          <p>
            We use only technically necessary cookies/local storage to maintain your session (sign-in) and local
            preferences (e.g. selected language). We do not use advertising or third-party tracking cookies.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">5. Your rights</h2>
          <p>
            You can delete your account at any time from your settings, which removes your profile data from our
            system. For questions about accessing, correcting, or deleting your data, contact us at the email below.
          </p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">6. Children</h2>
          <p>The service is not directed at individuals under 16, and we do not knowingly collect data from them.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">7. Changes to this policy</h2>
          <p>We may update this document from time to time. Changes take effect as soon as they’re posted here.</p>
        </section>

        <section>
          <h2 className="mb-2 text-base font-semibold text-foreground">8. Contact</h2>
          <p>
            For questions about this policy, email us at{" "}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline underline-offset-2 hover:text-foreground/70">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </section>
      </div>
    </>
  );
}

export function PrivacyPolicyView() {
  const { locale } = useLocale();

  return (
    <div className="relative min-h-screen w-full">
      <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">{locale === "bg" ? <PrivacyBG /> : <PrivacyEN />}</div>
      <Footer />
    </div>
  );
}
