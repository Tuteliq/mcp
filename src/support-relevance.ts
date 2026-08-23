/**
 * Presentation-layer guard for the crisis-support block.
 *
 * The API attaches a `support` block to a positive detection. It localises the
 * helplines correctly (pass `context.country` and Swedish results come back with
 * BRIS and 112, verified live), but when it cannot map the detected categories
 * onto a helpline topic it falls back to "return the first five lines for this
 * country" — so a phishing verdict and a weapon threat both arrive carrying a
 * domestic-violence line, a fraud line and a gambling line together.
 *
 * That fallback belongs in the API (see the note in the connector fix report),
 * but a moderator reading a tool result should not be handed three helplines
 * that have nothing to do with the harm in front of them. This module drops
 * the clearly-irrelevant ones at render time.
 *
 * It is deliberately conservative:
 *   - only the three narrowly-topical categories are ever dropped
 *     (`domesticViolence`, `fraudPrevention`, `gambling`);
 *   - general, crisis, emergency, child-protection and mental-health lines are
 *     always kept, because they are broadly applicable and the cost of hiding
 *     one is higher than the cost of showing one;
 *   - if filtering would empty the list, the original list is returned.
 *
 * No imports: this file is shared by the server formatters and the widget
 * bundle, which are built by different toolchains.
 */

/** Helpline topics narrow enough that showing an unrelated one is a defect. */
const TOPICAL_CATEGORIES = ['domesticviolence', 'fraudprevention', 'gambling'] as const;

type TopicalCategory = (typeof TOPICAL_CATEGORIES)[number];

/**
 * Harm signals that justify each topical helpline.
 *
 * Matched against both the endpoint/tool name and the detected category tags,
 * lower-cased, with `-` normalised to `_`. Substring matching keeps this robust
 * against the several naming vocabularies in play (`app-fraud` the endpoint,
 * `app_fraud` the batch type, `BANK_IMPERSONATION` the model's category tag).
 */
const TOPIC_SIGNALS: Record<TopicalCategory, string[]> = {
    domesticviolence: [
        'coercive_control', 'domestic', 'intimate_partner', 'tfgbv', 'stalking',
        'image_based_abuse', 'post_separation', 'digital_coercion', 'isolation',
        'financial_control', 'monitoring', 'surveillance', 'degradation',
    ],
    fraudprevention: [
        'fraud', 'scam', 'phish', 'social_engineering', 'mule', 'launder',
        'impersonation', 'investment', 'payment', 'financial_exploitation',
        'romance', 'pretext',
    ],
    gambling: ['gambling', 'betting', 'chasing_losses', 'wager'],
};

/** Normalise a harm signal or category tag for matching. */
function normalise(value: string): string {
    return value.toLowerCase().replace(/-/g, '_');
}

/**
 * Collect the harm signals for a detection result: the endpoint or tool name
 * plus every category, flag or type the result reports. Accepts the loose union
 * of shapes the detection tools return rather than a single result type.
 */
export function harmSignals(result: unknown, toolName?: string): string[] {
    const signals: string[] = [];
    if (toolName) signals.push(normalise(toolName.replace(/^detect_/, '')));

    const r = result as Record<string, unknown> | null | undefined;
    if (!r || typeof r !== 'object') return signals;

    if (typeof r.endpoint === 'string') signals.push(normalise(r.endpoint));

    const lists = [r.categories, r.bullying_type, r.flags, r.detected_endpoints];
    for (const list of lists) {
        if (!Array.isArray(list)) continue;
        for (const entry of list) {
            if (typeof entry === 'string') {
                signals.push(normalise(entry));
            } else if (entry && typeof entry === 'object' && typeof (entry as Record<string, unknown>).tag === 'string') {
                signals.push(normalise((entry as Record<string, unknown>).tag as string));
            }
        }
    }
    return signals;
}

/** Is this topical helpline justified by any of the harm signals? */
function isJustified(category: TopicalCategory, signals: string[]): boolean {
    const keywords = TOPIC_SIGNALS[category];
    return signals.some(signal => keywords.some(k => signal.includes(k)));
}

/**
 * Drop helplines whose topic contradicts the detected harm.
 *
 * Returns the input unchanged when there is nothing to drop, when no harm
 * signals are available to judge against, or when filtering would leave the
 * list empty — a wrong helpline is a quality bug, an absent one is a safety bug.
 */
export function relevantHelplines<T extends { category?: string }>(helplines: T[], signals: string[]): T[] {
    if (!helplines?.length || signals.length === 0) return helplines ?? [];
    const kept = helplines.filter(h => {
        const category = normalise(h.category ?? '');
        const topical = TOPICAL_CATEGORIES.find(c => c === category);
        return topical === undefined || isJustified(topical, signals);
    });
    return kept.length > 0 ? kept : helplines;
}
