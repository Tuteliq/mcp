import { describe, it, expect } from 'vitest';
import { formatQuota } from '../formatters.js';

describe('formatQuota', () => {
  it('renders the shape the API actually returns', () => {
    const text = formatQuota({
      apiKeyId: 'k', tier: 'business',
      limits: { requestsPerMinute: 300, requestsPerMonth: -1, requestsPerDay: 10000 },
      current: { requestsThisMinute: 4, requestsToday: 120 },
      remaining: { requestsThisMinute: 296, requestsToday: 9880 },
      resetsInSeconds: 41,
    });
    expect(text).toContain('**Tier:** business');
    expect(text).toContain('**Rate Limit:** 300/min');
    expect(text).toContain('**Used This Minute:** 4');
    expect(text).toContain('**Remaining This Minute:** 296');
    expect(text).toContain('**Resets In:** 41s');
    expect(text).toContain('**Remaining Today:** 9880 of 10000');
    expect(text).not.toMatch(/undefined|\[object Object\]/);
  });

  it('never prints undefined or [object Object], whatever the API omits', () => {
    const text = formatQuota({ tier: 'pro', limits: { requestsPerMinute: 60 }, remaining: {} });
    expect(text).toContain('**Rate Limit:** 60/min');
    expect(text).toContain('**Remaining This Minute:** n/a');
    expect(text).toContain('**Resets In:** n/a');
    expect(text).not.toMatch(/undefined|\[object Object\]/);
    expect(formatQuota(undefined)).not.toMatch(/undefined|\[object Object\]/);
  });

  it('still understands the flat legacy field names', () => {
    const text = formatQuota({ tier: 'starter', rate_limit: 30, remaining: 12, reset_in_seconds: 9 });
    expect(text).toContain('**Rate Limit:** 30/min');
    expect(text).toContain('**Remaining This Minute:** 12');
    expect(text).toContain('**Resets In:** 9s');
  });

  it('hides the daily line for unlimited tiers', () => {
    expect(formatQuota({ tier: 'enterprise', limits: { requestsPerMinute: 1000, requestsPerDay: -1 }, remaining: { requestsThisMinute: 1000 } })).not.toContain('Remaining Today');
  });
});
