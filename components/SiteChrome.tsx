import Link from "next/link";
import { navPages } from "@/content/pages";
import { site } from "@/lib/site";
import { HeaderCta } from "./LeadCta";
import { Logo } from "./icons";

export function SiteHeader({ page }: { page: string }) {
  return (
    <header className="border-b border-line bg-bg/85 backdrop-blur supports-[backdrop-filter]:bg-bg/70">
      <div className="container-page flex h-14 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight" aria-label={`${site.name} home`}>
          <Logo />
          <span className="text-[1.0625rem]">{site.name}</span>
        </Link>
        <nav aria-label="Converters" className="hidden items-center gap-1 text-sm text-ink-2 lg:flex">
          {navPages().map((item) => (
            <Link key={item.slug} href={`/${item.slug}`} className="rounded-lg px-2.5 py-1.5 hover:bg-surface-2 hover:text-ink">
              {item.nav}
            </Link>
          ))}
        </nav>
        <HeaderCta page={page} />
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-line">
      <div className="container-page grid gap-8 py-10 text-sm sm:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <p className="flex items-center gap-2 font-semibold">
            <Logo size={22} /> {site.name}
          </p>
          <p className="mt-3 max-w-sm leading-relaxed text-muted">
            A free converter for business paperwork. Uploads are deleted from our systems as soon as they are converted, and never kept
            longer than 24 hours.
          </p>
        </div>
        <div>
          <p className="font-semibold">Converters</p>
          <ul className="mt-3 space-y-2 text-ink-2">
            {navPages(true).map((item) => (
              <li key={item.slug}>
                <Link href={`/${item.slug}`} className="hover:text-ink hover:underline">
                  {item.h1}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <p className="font-semibold">About</p>
          <ul className="mt-3 space-y-2 text-ink-2">
            <li>
              <Link href="/privacy" className="hover:text-ink hover:underline">
                Privacy and data handling
              </Link>
            </li>
            <li>
              <Link href="/terms" className="hover:text-ink hover:underline">
                Terms of use
              </Link>
            </li>
            {site.contactEmail ? (
              <li>
                <a href={`mailto:${site.contactEmail}`} className="hover:text-ink hover:underline">
                  {site.contactEmail}
                </a>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </footer>
  );
}
