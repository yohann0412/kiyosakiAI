import type { Metadata } from "next";
import Link from "next/link";
import { LeadBand } from "@/components/LeadCta";
import { Faq, plain } from "@/components/PageBlocks";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { Tool } from "@/components/Tool";
import { ArrowRightIcon } from "@/components/icons";
import { PAGES, fill } from "@/content/pages";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: `${site.name}: Turn Paperwork into a Spreadsheet (Free)` },
  description: site.description,
  alternates: { canonical: "/" },
};

const FAQ = [
  {
    q: "What can I upload?",
    a: "A PDF, or a JPG, PNG or WebP image: a scan, a screenshot or a phone photo. Invoices, packing slips, bills of lading, purchase orders, receipts and handwritten order forms have their own tuned converters; anything else with a table is read as it is laid out.",
  },
  {
    q: "Is it really free?",
    a: "Yes. Your first {free} documents need no sign-up. After that we ask for a work email, which gives you {daily} documents a day. No watermark and no row limit. The tool pays for itself when a team with a daily pile of paperwork asks us to run it for them.",
  },
  {
    q: "How is this different from a PDF-to-Excel converter?",
    a: "A general converter copies the page layout, which is why tables come out as merged cells or a single column. This reads the document for what it is: it knows a line item from a total, keeps wrapped descriptions in one cell, joins tables across pages, and checks the arithmetic afterwards.",
  },
  {
    q: "How accurate is it?",
    a: "It depends on the document. Clean PDFs are usually read correctly; faint scans and rushed handwriting are harder. We do not publish an accuracy figure. Instead, every doubtful cell is highlighted, totals are checked in code, and you can correct anything against the original before you download.",
  },
  {
    q: "What happens to my files?",
    a: "They are read in memory and discarded as soon as your spreadsheet is ready, never kept longer than 24 hours, and never used for training, demos or examples. See the [privacy page](/privacy).",
  },
  {
    q: "Can I convert many documents at once?",
    a: "Yes. Drop up to {bulk} files together and download one workbook: a summary row per document, every line from every document on one sheet, and a sheet per document. Bulk conversion asks for an email first.",
  },
];

export default function Home() {
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: site.name,
      url: site.url,
      description: site.description,
      applicationCategory: "BusinessApplication",
      operatingSystem: "Any (runs in the browser)",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((item) => ({
        "@type": "Question",
        name: fill(item.q),
        acceptedAnswer: { "@type": "Answer", text: plain(item.a) },
      })),
    },
  ];

  return (
    <>
      <SiteHeader page="home" />
      <main>
        <section className="container-page pt-7 sm:pt-16">
          <h1 className="max-w-3xl text-[2rem] font-semibold leading-[1.1] sm:text-6xl">Turn paperwork into a spreadsheet</h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-ink-2 sm:mt-5 sm:text-lg">
            Upload a photo or PDF of an invoice, packing slip, bill of lading, purchase order, receipt or handwritten order. Get clean, editable
            rows back, with the arithmetic checked, and download them as Excel or CSV.
          </p>
        </section>

        <section className="container-page mt-5 sm:mt-8">
          <Tool page="home" docType="auto" />
        </section>

        <section className="prose-page container-page mt-16">
          <h2>A converter for each kind of document</h2>
          <p className="mt-3 max-w-3xl">
            Each one knows what belongs on that document: which values are header details, which are line items, and which totals should add up.
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {PAGES.map((page) => (
              <li key={page.slug}>
                <Link
                  href={`/${page.slug}`}
                  className="group flex h-full flex-col rounded-2xl border border-line bg-surface p-5 !text-ink !no-underline transition-colors hover:border-line-strong"
                >
                  <span className="flex items-center justify-between font-semibold">
                    {page.h1}
                    <ArrowRightIcon size={16} className="text-muted transition-transform group-hover:translate-x-0.5 group-hover:text-accent" />
                  </span>
                  <span className="mt-1.5 text-sm leading-relaxed text-muted">{page.blurb}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="prose-page container-page mt-16">
          <h2>How it works</h2>
          <ol className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              {
                title: "Upload",
                text: "Drop a PDF or a photo. Phone photos are shrunk in your browser first, so uploads are quick even on mobile data.",
              },
              {
                title: "It is read, then checked",
                text: "An AI model reads the document as the kind of document it is. Then ordinary code checks the arithmetic: quantity × price, the column sum, the total.",
              },
              {
                title: "Fix and download",
                text: "Doubtful cells are highlighted next to the original. Correct anything, then download Excel or CSV, or paste into Google Sheets.",
              },
            ].map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-line bg-surface p-5">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent">{i + 1}</span>
                <h3 className="!mt-3">{step.title}</h3>
                <p className="mt-1 text-[0.9375rem]">{step.text}</p>
              </li>
            ))}
          </ol>
        </section>

        <LeadBand page="home" />

        <section className="prose-page container-page mt-14">
          <h2>What it does that a generic converter doesn't</h2>
          <ul className="mt-5 grid max-w-4xl gap-x-8 gap-y-3 md:grid-cols-2">
            {[
              ["One row per line item", "Wrapped descriptions stay in one cell and tables that run across pages are joined, instead of a grid of merged cells."],
              ["Real numbers and dates", "No currency symbols or thousands separators stored as text. Dates are written so they cannot be read the wrong way round."],
              ["Arithmetic checked in code", "Rows that don't multiply out and totals that don't add up are highlighted. Nothing is silently \"fixed\"."],
              ["Doubt is shown", "A smudged or handwritten digit is highlighted with the reason, such as \"7 or 1\", rather than passed off as certain."],
              ["Photos and handwriting", "Skewed phone photos, faxes, stamps and filled-in forms are expected input, not edge cases."],
              ["Import-ready layout", "One row per line with the document number, date and parties repeated on each: the shape accounting and ERP imports want."],
            ].map(([title, text]) => (
              <li key={title} className="relative pl-5 before:absolute before:left-0 before:top-[0.7em] before:h-1.5 before:w-1.5 before:rounded-full before:bg-accent">
                <strong className="font-semibold text-ink">{title}. </strong>
                {text}
              </li>
            ))}
          </ul>
        </section>

        <Faq items={FAQ} />
      </main>
      <SiteFooter />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
    </>
  );
}
