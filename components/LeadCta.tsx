"use client";

import { tuning } from "@/content/tuning";
import { ArrowRightIcon } from "./icons";
import { openLead } from "./lead";

/** Header button. */
export function HeaderCta({ page }: { page: string }) {
  return (
    <button type="button" className="btn btn-secondary btn-sm" onClick={() => openLead({ page, source: "header" })}>
      <span className="hidden sm:inline">Have us do it for you</span>
      <span className="sm:hidden">Done for you</span>
    </button>
  );
}

/** The offer, as a full-width band between sections. */
export function LeadBand({ page, docType, plural }: { page: string; docType?: string; plural?: string }) {
  return (
    <section className="container-page my-14">
      <div className="relative overflow-hidden rounded-3xl bg-ink px-6 py-10 text-bg sm:px-12 sm:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -top-10 h-56 w-56 opacity-[0.08]"
          style={{
            backgroundImage:
              "linear-gradient(var(--bg) 1.5px, transparent 1.5px), linear-gradient(90deg, var(--bg) 1.5px, transparent 1.5px)",
            backgroundSize: "28px 28px",
          }}
        />
        <div className="relative max-w-2xl">
          <h2 className="text-2xl font-semibold sm:text-3xl">{tuning.cta.heading}</h2>
          <p className="mt-3 text-base leading-relaxed opacity-80 sm:text-lg">
            {plural
              ? `If ${plural} land on your desk every day, we'll handle all of them for you: every document read, checked and delivered as rows in the format your system imports.`
              : tuning.cta.body}
          </p>
          <button
            type="button"
            className="btn mt-6 bg-bg text-ink hover:opacity-90"
            onClick={() => openLead({ page, docType, source: "band" })}
          >
            {tuning.cta.button} <ArrowRightIcon />
          </button>
          <p className="mt-3 text-sm opacity-60">Three questions, no call required. A person replies by email.</p>
        </div>
      </div>
    </section>
  );
}
