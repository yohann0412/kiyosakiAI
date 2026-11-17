import { track } from "@/lib/client/api";

export interface LeadContext {
  page: string;
  /** Pre-selects the document type on the form. */
  docType?: string;
  /** Where the button was: header, band, result, limit, bulk. */
  source: string;
}

const EVENT = "sl:lead";

/** Open the "We'll do it for you" form from anywhere on the page. */
export function openLead(context: LeadContext) {
  track("cta_click", context.page, { source: context.source });
  window.dispatchEvent(new CustomEvent<LeadContext>(EVENT, { detail: context }));
}

export function onLeadOpen(handler: (context: LeadContext) => void) {
  const listener = (event: Event) => handler((event as CustomEvent<LeadContext>).detail);
  window.addEventListener(EVENT, listener);
  return () => window.removeEventListener(EVENT, listener);
}
