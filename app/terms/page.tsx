import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { tuning } from "@/content/tuning";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Terms of use",
  description: `The short terms for using ${site.name}.`,
  alternates: { canonical: "/terms" },
};

export default function Terms() {
  return (
    <>
      <SiteHeader page="terms" />
      <main className="prose-page container-page max-w-3xl py-12">
        <h1 className="text-4xl font-semibold">Terms of use</h1>
        <p className="mt-4">Last updated 17 November 2026.</p>

        <h2 className="!mt-10">What this is</h2>
        <p className="mt-3">
          {site.name} is a free tool that reads a document you upload and gives you its contents as a spreadsheet. Your first{" "}
          {tuning.freeDocs} documents need no sign-up; after that we ask for an email and apply a daily fair-use limit.
        </p>

        <h2 className="!mt-10">Check the output</h2>
        <p className="mt-3">
          The documents are read by an AI model, and it makes mistakes. Highlighted cells and arithmetic warnings help you find them, but they
          do not catch everything. You are responsible for checking the result before you rely on it for payments, filings, shipments or
          anything else that matters. The tool is provided as is, without warranties, and to the extent the law allows we are not liable for
          losses caused by errors in its output or by it being unavailable.
        </p>

        <h2 className="!mt-10">What you may upload</h2>
        <p className="mt-3">
          Only upload documents you have the right to share with a third-party service, and nothing unlawful. Please do not try to get
          around the usage limits or overload the service; we may block traffic that does.
        </p>

        <h2 className="!mt-10">Your data</h2>
        <p className="mt-3">
          Your documents remain yours. How they are handled is set out on the <Link href="/privacy">privacy page</Link>.
        </p>

        <h2 className="!mt-10">Changes</h2>
        <p className="mt-3">We may change the limits, the features or these terms, or stop offering the tool. The date at the top shows the latest version.</p>
      </main>
      <SiteFooter />
    </>
  );
}
