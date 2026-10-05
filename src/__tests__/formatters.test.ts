import { describe, it, expect } from 'vitest';
import type { UsageQuota } from '@tuteliq/sdk';
import { formatQuota, formatMessageRows, formatUsageSummary } from '../formatters.js';

const full: UsageQuota = {
  apiKeyId: 'k', tier: 'business',
  limits: { requestsPerMinute: 300, requestsPerMonth: -1, requestsPerDay: 10000 },
  current: { requestsThisMinute: 4, requestsToday: 120 },
  remaining: { requestsThisMinute: 296, requestsToday: 9880 },
  resetsInSeconds: 41,
};

describe('formatQuota', () => {
  it('renders the shape the API returns (SDK UsageQuota 2.33.0)', () => {
    const text = formatQuota(full);
    expect(text).toContain('**Tier:** business');
    expect(text).toContain('**Rate Limit:** 300/min');
    expect(text).toContain('**Used This Minute:** 4');
    expect(text).toContain('**Remaining This Minute:** 296');
    expect(text).toContain('**Resets In:** 41s');
    expect(text).toContain('**Remaining Today:** 9880 of 10000');
    expect(text).not.toMatch(/undefined|\[object Object\]/);
  });

  it('shows n/a for resetsInSeconds against an API deployment older than the field', () => {
    const { resetsInSeconds: _omitted, ...older } = full;
    const text = formatQuota(older);
    expect(text).toContain('**Resets In:** n/a');
    expect(text).not.toMatch(/undefined|\[object Object\]/);
  });

  it('never prints undefined or [object Object], whatever the wire omits', () => {
    const partial = { tier: 'pro', limits: { requestsPerMinute: 60 }, remaining: {} } as unknown as UsageQuota;
    const text = formatQuota(partial);
    expect(text).toContain('**Rate Limit:** 60/min');
    expect(text).toContain('**Remaining This Minute:** n/a');
    expect(text).toContain('**Resets In:** n/a');
    expect(text).not.toMatch(/undefined|\[object Object\]/);
    expect(formatQuota(undefined as unknown as UsageQuota)).not.toMatch(/undefined|\[object Object\]/);
  });

  it('hides the daily line for unlimited tiers', () => {
    const unlimited = { ...full, tier: 'enterprise', limits: { ...full.limits, requestsPerDay: -1 } };
    expect(formatQuota(unlimited)).not.toContain('Remaining Today');
  });
});

describe('formatMessageRows', () => {
  const rows = [
    { message_index: 1, risk_score: 0.6, flags: ['flattery'], summary: 'praise' },
    { message_index: 3, risk_score: 0, flags: [], unsupported_flags: ['flattery'], summary: 'asks a question' },
  ];

  it('says how many messages have a row when some do not, and what a missing row means', () => {
    const text = formatMessageRows(rows, 11);
    expect(text).toContain('2 of 11 messages have a row; a message without a row carried no per-message finding.');
    expect(text).toContain('**Message 1** (risk: 60%) [flattery] — praise');
  });

  it('omits the coverage line when every message has a row', () => {
    expect(formatMessageRows(rows, 2)).not.toContain('messages have a row');
  });

  it('shows a withdrawn tactic as withdrawn, separate from the active flags', () => {
    const text = formatMessageRows(rows, 11);
    expect(text).toContain('**Message 3** (risk: 0%) (withdrawn: flattery) — asks a question');
    expect(text).not.toContain('[flattery] (withdrawn');
  });

  it('renders nothing without rows', () => {
    expect(formatMessageRows(undefined, 5)).toBe('');
    expect(formatMessageRows([], 5)).toBe('');
  });
});

describe('formatQuota daily wording', () => {
  it('says the daily figure counts completed requests', () => {
    const text = formatQuota({
      tier: 'business',
      limits: { requestsPerMinute: 5000, requestsPerMonth: -1, requestsPerDay: 6667 },
      current: { requestsThisMinute: 3, requestsToday: 0 },
      remaining: { requestsThisMinute: 4996, requestsToday: 6667 },
      resetsInSeconds: 60,
    });
    expect(text).toContain('**Remaining Today:** 6667 of 6667 (completed requests; calls still in flight are counted when they finish)');
  });
});

describe('formatUsageSummary', () => {
  // What GET /usage/summary returns. The SDK's UsageSummary type (2.33.x)
  // declares a billing-period shape the route has never sent.
  const wire = {
    apiKeyId: 'k', tier: 'business', date: '2026-10-05',
    usage: { totalRequests: 120, successRequests: 118, errorRequests: 2 },
    quota: { requestsPerMinute: 5000, requestsPerDay: 6667, remainingToday: 6547 },
  };

  it('renders the shape the API returns', () => {
    const text = formatUsageSummary(wire);
    expect(text).toContain('**Tier:** business');
    expect(text).toContain('**Date:** 2026-10-05');
    expect(text).toContain('**Requests Today:** 120 (118 succeeded, 2 failed)');
    expect(text).toContain('**Remaining Today:** 6547 of 6667');
    expect(text).toContain('**Rate Limit:** 5000/min');
    expect(text).not.toMatch(/undefined|NaN|\[object Object\]/);
  });

  it('says unlimited when the tier has no daily limit', () => {
    const text = formatUsageSummary({ ...wire, quota: { requestsPerMinute: 5000, requestsPerDay: -1, remainingToday: -1 } });
    expect(text).toContain('**Remaining Today:** unlimited');
  });

  it('renders the billing-period shape too, should an API ever send it', () => {
    const text = formatUsageSummary({
      messages_used: 6736, message_limit: 205000, usage_percentage: 3.29, purchased_credits: 0,
      total_available: 205000, period_start: '2026-10-01', period_end: '2026-10-31', days_remaining: 26,
    });
    expect(text).toContain('**Used:** 6736 / 205000 (3.3%)');
    expect(text).toContain('26 days left');
    expect(text).not.toMatch(/undefined|NaN/);
  });

  it.each([[undefined], [null], [{}], [{ usage: {} }], [{ quota: { requestsPerDay: 'many' } }], ['not an object']])(
    'never throws and never prints undefined for %j', (body) => {
      const text = formatUsageSummary(body);
      expect(text).toContain('## Usage Summary');
      expect(text).not.toMatch(/undefined|NaN|\[object Object\]/);
    });
});
