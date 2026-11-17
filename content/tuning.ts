/**
 * The knobs the nightly loop turns. One experiment = one change here (or in a
 * page), logged in lab_notebook.md and results.tsv before and after.
 *
 * Anything that changes how uploaded data is stored or used is NOT a knob:
 * that needs the human's approval (see program.md).
 */
export const tuning = {
  /** Documents a visitor can convert before we ask for an email. Experiment: 3 vs 10. */
  freeDocs: 3,
  /** Documents per day once an email is on file. */
  emailDailyDocs: 25,
  /** Backstop per IP per day without an email (cookies can be cleared). */
  ipDailyAnon: 8,
  /** Hard ceiling per IP per day, email or not. */
  ipDailyMax: 60,
  /** Uploads per IP per minute. */
  burstPerMinute: 6,
  /** Files per bulk batch (bulk needs an email). */
  bulkMaxFiles: 25,
  /**
   * Model spend ceiling per day in USD. $1.50/day is about $45 a month, which
   * leaves room for hosting inside the $50 budget. Override with DAILY_BUDGET_USD.
   */
  dailyBudgetUsd: Number(process.env.DAILY_BUDGET_USD ?? 1.5),
  /** Largest request body we accept (the host caps bodies at 4.5 MB). */
  maxUploadBytes: 4_300_000,

  /** Lead-capture wording. Experiment: wording and placement. */
  cta: {
    button: "Process these every day? We'll do it for you",
    heading: "Doing 50 of these a day?",
    body: "We'll handle all of them for you: every document read, checked and delivered as rows in the format your system imports.",
    formTitle: "Tell us about your paperwork",
    formIntro: "Three quick questions. A person reads every reply.",
    submit: "Send",
    success: "Thanks - we've got it. We'll reply to your email shortly.",
  },

  /** Email-gate wording. */
  gate: {
    title: "Keep converting for free",
    body: "You've used your free conversions without an account. Add your work email to carry on - it stays free.",
    bulkTitle: "Bulk conversion needs an email",
    bulkBody: "Converting several documents at once is free. We just ask for a work email first.",
    finePrint: "One confirmation email. No newsletter, no sharing your address.",
    submit: "Continue",
  },
} as const;

export type Tuning = typeof tuning;
