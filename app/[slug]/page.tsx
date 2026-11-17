import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LeadBand } from "@/components/LeadCta";
import { Faq, PageBlock, loadSample, plain } from "@/components/PageBlocks";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Tool } from "@/components/Tool";
import { PAGES, fill, pageBySlug } from "@/content/pages";
import { DOC_TYPES } from "@/core/extractor/doctypes";
import { site } from "@/lib/site";

export const dynamicParams = false;

export function generateStaticParams() {
  return PAGES.map((page) => ({ slug: page.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = pageBySlug(slug);
  if (!page) return {};
  return {
    title: { absolute: page.title },
    description: fill(page.description),
    alternates: { canonical: `/${page.slug}` },
    openGraph: { title: page.title, description: fill(page.description), url: `/${page.slug}`, type: "website" },
  };
}

export default async function ToolPageRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pageBySlug(slug);
  if (!page) notFound();

  const hasSample = Boolean(page.sample && loadSample(page.sample.id));
  const plural = page.docType === "auto" ? "handwritten forms" : DOC_TYPES[page.docType].plural;

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: `${page.h1} converter`,
      url: `${site.url}/${page.slug}`,
      description: fill(page.description),
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (runs in the browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      publisher: { "@type": "Organization", name: site.name, url: site.url },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: page.faq.map((item) => ({
        "@type": "Question",
        name: fill(item.q),
        acceptedAnswer: { "@type": "Answer", text: plain(item.a) },
      })),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: site.name, item: site.url },
        { "@type": "ListItem", position: 2, name: page.h1, item: `${site.url}/${page.slug}` },
      ],
    },
  ];

  return (
    <>
      <SiteHeader page={page.slug} />
      <main>
        <section className="container-page pt-8 sm:pt-12">
          <nav aria-label="Breadcrumb" className="text-sm text-muted">
            <Link href="/" className="hover:text-ink hover:underline">
              All converters
            </Link>
            <span className="mx-1.5">/</span>
            <span>{page.h1}</span>
          </nav>
          <h1 className="mt-3 text-4xl font-semibold sm:text-5xl">{page.h1}</h1>
          <p className="mt-4 max-w-3xl text-lg leading-relaxed text-ink-2">{fill(page.intro)}</p>
        </section>

        <section className="container-page mt-7">
          <Tool page={page.slug} docType={page.docType} sample={hasSample && page.sample ? { ...page.sample, image: `/samples/${page.sample.id}.jpg` } : undefined} />
        </section>

        {page.blocks.slice(0, 2).map((block, i) => (
          <PageBlock key={i} block={block} page={page} />
        ))}

        <LeadBand page={page.slug} docType={page.docType} plural={plural} />

        {page.blocks.slice(2).map((block, i) => (
          <PageBlock key={i} block={block} page={page} />
        ))}

        <Faq items={page.faq} />

        <section className="prose-page container-page mt-14">
          <h2>Related converters</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-3">
            {page.related.map((slug) => {
              const other = pageBySlug(slug);
              if (!other) return null;
              return (
                <li key={slug}>
                  <Link
                    href={`/${slug}`}
                    className="block h-full rounded-2xl border border-line bg-surface p-5 !text-ink !no-underline transition-colors hover:border-line-strong"
                  >
                    <span className="font-semibold">{other.h1}</span>
                    <span className="mt-1 block text-sm text-muted">{other.blurb}</span>
                  </Link>
                </li>
              );
            })}
          </ul>
          <p className="mt-6 text-sm text-muted">Last updated {page.updated}.</p>
        </section>
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
