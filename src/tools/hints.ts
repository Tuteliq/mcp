/**
 * TOOL ANNOTATIONS ARE CLAIMS WE SIGN FOR. See __tests__/annotations.test.ts.
 *
 * Two kinds of tool were marked read-only and closed-world when they are not.
 */

/**
 * A detection call that takes correlation fields (`external_id`,
 * `customer_id`, `metadata`, `incident_moderation_enabled`).
 *
 * Those fields exist because the call can leave something behind: a detection
 * above the account's threshold is stored as an incident, and it is delivered
 * to the webhook destinations the account has configured. A stored record is a
 * side effect a user can see, so the call is not read-only. A webhook goes to
 * an address outside this service, so the world it can touch is not closed.
 * Nothing is deleted or overwritten, so it is not destructive.
 */
export const RECORDS_AND_NOTIFIES = { readOnlyHint: false, destructiveHint: false, openWorldHint: true } as const;

/**
 * An analysis that can be given a `url` to download its input from.
 *
 * It changes nothing, so it stays read-only. It fetches from an address the
 * caller names, which is an independently controlled system, so the world it
 * can touch is not closed.
 */
export const FETCHES_FROM_URL = { readOnlyHint: true, destructiveHint: false, openWorldHint: true } as const;
