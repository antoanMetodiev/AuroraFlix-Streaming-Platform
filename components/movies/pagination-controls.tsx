"use client";

import Link from "next/link";
import { useTranslation } from "@/lib/i18n/locale-context";

type PageEntry = number | "...";

function generatePages(current: number, total: number, visible: number): PageEntry[] {
  const pages: PageEntry[] = [];
  const half = Math.floor(visible / 2);

  let start = Math.max(1, current - half);
  let end = start + visible - 1;

  if (end > total) {
    end = total;
    start = Math.max(1, end - visible + 1);
  }

  if (start > 1) pages.push(1);
  if (start > 2) pages.push("...");
  for (let page = start; page <= end; page++) pages.push(page);
  if (end < total - 1) pages.push("...");
  if (end < total) pages.push(total);

  return pages;
}

function PageButton({
  isActive,
  isDisabled,
  href,
  children,
  className = "",
}: {
  isActive?: boolean;
  isDisabled?: boolean;
  href: string;
  children: React.ReactNode;
  className?: string;
}) {
  const base = "flex h-8.5 w-8.5 items-center justify-center rounded-full border text-xs backdrop-blur-md transition-all duration-200";

  if (isDisabled) {
    return (
      <span className={`${base} cursor-not-allowed border-foreground/12 bg-foreground/8 text-foreground/85 opacity-35 ${className}`}>
        {children}
      </span>
    );
  }

  return (
    <Link
      href={href}
      aria-current={isActive ? "page" : undefined}
      className={`${base} ${className} ${
        isActive
          ? "border-transparent bg-linear-to-br from-[#4a00e0] to-[#8e2de2] font-bold text-white shadow-[0_0_15px_rgba(142,45,226,0.55)]"
          : "border-foreground/12 bg-foreground/8 text-foreground/85 hover:-translate-y-0.5 hover:scale-105 hover:bg-foreground/18 hover:text-foreground"
      }`}
    >
      {children}
    </Link>
  );
}

function PageGroup({
  current,
  total,
  visible,
  basePath,
  extraQuery,
  visibilityClass,
}: {
  current: number;
  total: number;
  visible: number;
  basePath: string;
  extraQuery?: string;
  visibilityClass: string;
}) {
  const pages = generatePages(current, total, visible);
  const hrefFor = (page: number) => `${basePath}?${extraQuery ? `${extraQuery}&` : ""}page=${page}`;

  return (
    <div className={`${visibilityClass} items-center gap-1.5`}>
      <PageButton href={hrefFor(current - 1)} isDisabled={current === 1}>
        ◀
      </PageButton>

      {pages.map((page, index) =>
        page === "..." ? (
          <span key={`ellipsis-${index}`} className="px-1 text-xs text-foreground/65">
            …
          </span>
        ) : (
          <PageButton key={page} href={hrefFor(page)} isActive={page === current}>
            {page}
          </PageButton>
        )
      )}

      <PageButton href={hrefFor(current + 1)} isDisabled={current === total}>
        ▶
      </PageButton>
    </div>
  );
}

export function PaginationControls({
  currentPage,
  totalPages,
  basePath,
  extraQuery,
}: {
  currentPage: number;
  totalPages: number;
  basePath: string;
  extraQuery?: string;
}) {
  const { t } = useTranslation();

  if (totalPages <= 1) return null;

  return (
    <nav
      aria-label={t("common.pagination")}
      className="mx-auto my-8 flex w-fit gap-1.5 rounded-full border border-foreground/12 bg-foreground/10 px-3 py-2 shadow-[0_8px_25px_rgba(0,0,0,0.2)] backdrop-blur-md"
    >
      <PageGroup current={currentPage} total={totalPages} visible={3} basePath={basePath} extraQuery={extraQuery} visibilityClass="flex sm:hidden" />
      <PageGroup current={currentPage} total={totalPages} visible={5} basePath={basePath} extraQuery={extraQuery} visibilityClass="hidden sm:flex lg:hidden" />
      <PageGroup current={currentPage} total={totalPages} visible={9} basePath={basePath} extraQuery={extraQuery} visibilityClass="hidden lg:flex" />
    </nav>
  );
}
