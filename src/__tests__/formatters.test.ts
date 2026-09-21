import { describe, it, expect } from 'vitest';
import type { UsageQuota } from '@tuteliq/sdk';
import { formatQuota } from '../formatters.js';

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
