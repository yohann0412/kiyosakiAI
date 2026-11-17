import type { Metadata } from "next";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { tuning } from "@/content/tuning";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy and data handling",
  description: `What ${site.name} does with the documents you upload: read in memory, deleted straight away, never kept past 24 hours, never used for training.`,
  alternates: { canonical: "/privacy" },
};

export default function Privacy() {
  return (
    <>
      <SiteHeader page="privacy" />
      <main className="prose-page container-page max-w-3xl py-12">
        <h1 className="text-4xl font-semibold">Privacy and data handling</h1>
        <p className="mt-4">Last updated 17 November 2026. Written to be read, not to be skipped.</p>

        <h2 className="!mt-10">The documents you upload</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            Your file is held in memory while it is being read and discarded as soon as your spreadsheet is ready. We do not write it to our
            disks or databases.
          </li>
          <li>
            Nothing from an upload is kept on our systems for longer than 24 hours. An hourly job enforces that limit as a backstop.
          </li>
          <li>We do not use uploads for training, for demos, for examples, or for anything other than producing your spreadsheet.</li>
          <li>We do not look at them. No person at {site.name} sees your documents.</li>
          <li>
            The extracted table is sent back to your browser and is not stored on our servers. The Excel and CSV files are built in your
            browser.
          </li>
        </ul>

        <h2 className="!mt-10">Who else handles the file</h2>
        <p className="mt-3">
          To read a document we send it to an AI model operated by Anthropic, under Anthropic's commercial terms. Anthropic does not use
          this data to train its models. Like most API providers, it may keep requests for a limited period for safety and abuse monitoring;
          that period is set by Anthropic and described in{" "}
          <a href="https://privacy.anthropic.com/" target="_blank" rel="noopener noreferrer">
            its privacy documentation
          </a>
          . Our 24-hour statement is about our own systems.
        </p>
        <p>The site is hosted on Vercel, which keeps standard request logs (IP address, URL, time) for a limited time.</p>
        <p>If a document is too sensitive for that chain, please do not upload it.</p>

        <h2 className="!mt-10">What we do keep</h2>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <strong>Usage counts.</strong> That a page was visited, a file was uploaded, a conversion succeeded or failed, a file was
            downloaded: with the page, the document type, the number of pages and rows, and how long it took. Never the contents.
          </li>
          <li>
            <strong>Your email, if you give it.</strong> After {tuning.freeDocs} free documents, or for bulk conversion, we ask for a work
            email. We store it so your access continues and so we can reply to you. You get one confirmation email. No newsletter. We do not
            sell or share it.
          </li>
          <li>
            <strong>What you write in the "We'll do it for you" form.</strong> It is read by a person and used to reply to you.
          </li>
          <li>
            <strong>A scrambled form of your IP address</strong>, for up to three days, to enforce fair-use limits. The address itself is
            not stored by the application.
          </li>
        </ul>

        <h2 className="!mt-10">Cookies</h2>
        <p className="mt-3">Three first-party cookies, no advertising or third-party trackers:</p>
        <ul className="mt-3 list-disc space-y-2 pl-5">
          <li>
            <code>sl_v</code>: a random ID so we can count visitors without knowing who they are.
          </li>
          <li>
            <code>sl_u</code>: how many free conversions this browser has used.
          </li>
          <li>
            <code>sl_e</code>: the email you gave us, so you are not asked again.
          </li>
        </ul>

        <h2 className="!mt-10">Asking us to delete something</h2>
        <p className="mt-3">
          {site.contactEmail ? (
            <>
              Email <a href={`mailto:${site.contactEmail}`}>{site.contactEmail}</a>
            </>
          ) : (
            <>Use the "Have us do it for you" form at the top of any page and say so in the notes</>
          )}{" "}
          and we will delete your email address and any form submission. There are no stored documents to delete.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
