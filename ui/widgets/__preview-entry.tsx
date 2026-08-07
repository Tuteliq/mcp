/**
 * Local design harness — NOT shipped.
 *
 * Renders every widget against fixture data on the host's dark backdrop so the
 * cards can be checked side by side. `npm run preview:ui` builds it to
 * dist-preview/, which is gitignored.
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import { DetectionPage } from '@ui/pages/DetectionPage';
import { IncidentsOverviewPage } from '@ui/pages/IncidentsOverviewPage';
import { IncidentsListPage } from '@ui/pages/IncidentsListPage';
import { IncidentTrendsPage } from '@ui/pages/IncidentTrendsPage';
import { ReportPage } from '@ui/pages/ReportPage';
import { ActionPlanPage } from '@ui/pages/ActionPlanPage';
import { MultiPage } from '@ui/pages/MultiPage';
import { EmotionsPage } from '@ui/pages/EmotionsPage';
import { MediaPage } from '@ui/pages/MediaPage';
import { IncidentDetailPage } from '@ui/pages/IncidentDetailPage';
import { SyntheticPage } from '@ui/pages/SyntheticPage';
import { ModerationQueuePage } from '@ui/pages/ModerationQueuePage';
import { BrandedLoader } from '@ui/components/BrandedLoader';
import { baseStyles } from '@ui/theme';

const detection = {
  toolName: 'detect_bullying',
  branding: { appName: 'Tuteliq' },
  result: {
    detected: true,
    level: 'medium',
    risk_score: 0.6,
    confidence: 0.8,
    categories: ['humiliation'],
    rationale:
      'Direct personal insults targeting appearance; no mitigating banter or in-group reappropriation cues.',
    recommended_action: 'flag_for_review',
    action_detail: 'Route to a human moderator within the standard 24-hour SLA.',
    evidence: [
      { text: 'nobody wants you here, you look disgusting', tactic: 'humiliation', weight: 0.82 },
      { text: 'everyone was laughing at you again', tactic: 'social_exclusion', weight: 0.64 },
      { text: 'just delete your account already', tactic: 'intimidation', weight: 0.51 },
    ],
    age_calibration: { applied: true, age_group: '13–15', multiplier: 1.3 },
    support: {
      country: 'SE',
      country_name: 'Sweden',
      emergency_number: '112',
      helplines: [
        { name: 'BRIS', number: '116 111', description: "Children's helpline", category: 'bullying', available: '24/7' },
        { name: 'Mind Självmordslinjen', number: '90101', description: 'Suicide prevention', category: 'self_harm', available: '24/7' },
        { name: 'Polisen Tips', number: '114 14', description: 'Report crimes to police', category: 'violence', available: '24/7' },
      ],
      response_guide: {
        category: 'bullying',
        immediateActions: [
          'Document the behaviour with screenshots',
          'Report the content or user to the platform',
          'Talk to the child in a calm, supportive manner',
          'Contact the school if peers are involved',
        ],
        resources: [
          { name: 'BRIS support guide', description: 'What to do when a child is being bullied', url: 'https://bris.se' },
        ],
      },
    },
  },
};

const overview = {
  result: {
    timeframe: { from: '2026-07-07T00:00:00Z', to: '2026-08-06T00:00:00Z' },
    total_incidents: 40387,
    requires_review_count: 38827,
    last_24h_count: 75,
    last_7d_count: 177,
    last_30d_count: 40387,
    counts_by_category: {
      grooming: 29033,
      romance_scam: 1664,
      social_engineering: 1623,
      coercive_control: 1406,
      mule_recruitment: 1280,
      bullying: 902,
      radicalisation: 640,
      gambling_harm: 420,
      tfgbv: 320,
      self_harm: 280,
      unsafe: 190,
      app_fraud: 130,
    },
    counts_by_severity: { critical: 27613, high: 11216, moderate: 1251, low: 307 },
    counts_by_source: { text: 33900, image: 4200, video: 1500, voice: 787 },
    counts_by_status: { new: 38827, reviewing: 900, escalated: 400, resolved: 260 },
    top_platforms: [
      { platform: 'whatsapp', count: 18200 },
      { platform: 'instagram', count: 9100 },
      { platform: 'discord', count: 6400 },
      { platform: 'snapchat', count: 4200 },
      { platform: 'roblox', count: 1800 },
      { platform: 'telegram', count: 687 },
    ],
  },
};

const mkIncident = (
  id: string,
  category: string,
  level: string,
  patterns: string[],
  ext: string,
  source = 'text',
) => ({
  id,
  risk_category: category,
  risk_level: level,
  confidence_score: 0.95,
  detected_patterns: patterns,
  platform: null,
  source,
  status: 'new',
  external_id: ext,
  customer_id: '5caea63a-1f22-4b0e-9a01-2c9f7e3b1d44',
  created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  summary: null,
  _e2e_envelope_fields: ['summary'],
});

const list = {
  result: {
    total_returned: 20,
    next_cursor: 'eyJvZmZzZXQiOjIwfQ==',
    incidents: [
      mkIncident('1a06578a-9f31-4c2b-b8e1-77a3d9e2f001', 'bullying', 'critical', ['exclusion', 'intimidation'], 'battery-meetup-risk'),
      mkIncident('950d5e9f-3b12-4a77-9c40-1e8b2f7a6002', 'unsafe', 'critical', ['sexual_exploitation'], 'battery-sextortion'),
      mkIncident('c9ca5cfd-77e4-4b18-a3d2-5f9c1e4b8003', 'self_harm', 'high', ['self_harm'], 'battery-self-harm'),
      mkIncident('b1594950-2a66-4f90-8e75-3d1a7c6e9004', 'unsafe', 'medium', ['Nudity / Sexual Content'], 'draft-1785965045529', 'image'),
      mkIncident('d2705a61-4b77-4a01-9f86-4e2b8d7f0005', 'romance_scam', 'low', ['financial_request'], 'batch-romance-01'),
    ],
  },
};

const trends = {
  result: {
    bucket_size: 'day' as const,
    timeframe: { from: '2026-07-24T00:00:00Z', to: '2026-08-06T00:00:00Z' },
    series: Array.from({ length: 14 }, (_, i) => {
      const critical = [12, 18, 9, 24, 31, 15, 22, 40, 28, 19, 35, 26, 44, 30][i];
      const high = [8, 11, 6, 14, 19, 10, 13, 21, 17, 12, 20, 16, 25, 18][i];
      const medium = [4, 6, 3, 7, 9, 5, 6, 11, 8, 6, 10, 8, 12, 9][i];
      const low = [2, 3, 1, 4, 5, 2, 3, 6, 4, 3, 5, 4, 7, 5][i];
      return {
        bucket_start: new Date(Date.UTC(2026, 6, 24 + i)).toISOString(),
        total: critical + high + medium + low,
        by_severity: { critical, high, medium, low },
      };
    }),
  },
};

const report = {
  toolName: 'generate_report',
  branding: { appName: 'Tuteliq' },
  result: {
    risk_level: 'high',
    summary:
      'Sustained pattern of coercive messaging across 47 exchanges over nine days, escalating from flattery to isolation and financial requests. Subject is a minor; counterparty account created three weeks prior with no other contacts.',
    categories: ['grooming', 'isolation', 'financial_request'],
    recommended_next_steps: [
      'Preserve the full conversation export with hashes for chain of custody',
      'Escalate to the designated safeguarding lead within 24 hours',
      'Suspend the counterparty account pending review',
      'Notify the guardian using the prepared response script',
    ],
  },
};

const actionPlan = {
  toolName: 'get_action_plan',
  branding: { appName: 'Tuteliq' },
  result: {
    audience: 'parent',
    tone: 'supportive',
    reading_level: 'plain English',
    steps: [
      'Find a calm, private moment — avoid opening the conversation straight after school.',
      'Lead with what you noticed, not what you concluded: "I saw you seemed upset after being on your phone."',
      'Let them finish before responding. Silences are fine.',
      'Reassure them they are not in trouble and did nothing wrong.',
      'Agree one concrete next step together, so they leave the conversation with agency.',
      'Save the evidence before deleting anything, and report the account to the platform.',
    ],
  },
};

const multi = {
  toolName: 'analyse_multi',
  branding: { appName: 'Tuteliq' },
  result: {
    summary: {
      overall_risk_level: 'high',
      detected_count: 3,
      total_endpoints: 8,
      highest_risk: { risk_score: 0.87, endpoint: 'detect_grooming' },
    },
    cross_endpoint_modifier: 1.24,
    results: [
      { endpoint: 'detect_bullying', detected: false, level: 'none', risk_score: 0.04, confidence: 0.93, categories: [] },
      { endpoint: 'detect_grooming', detected: true, level: 'high', risk_score: 0.87, confidence: 0.91, categories: ['isolation', 'secrecy'], rationale: 'Sustained attempts to move the conversation to an unmonitored channel, paired with instructions to keep the friendship private.' },
      { endpoint: 'detect_unsafe', detected: false, level: 'none', risk_score: 0.02, confidence: 0.95, categories: [] },
      { endpoint: 'detect_romance_scam', detected: true, level: 'medium', risk_score: 0.55, confidence: 0.78, categories: ['financial_request'], rationale: 'A single request for a gift card, without the sustained trust-building typical of the pattern.' },
      { endpoint: 'detect_coercive_control', detected: true, level: 'critical', risk_score: 0.92, confidence: 0.88, categories: ['monitoring', 'threats'], rationale: 'Explicit threats tied to compliance, plus demands for location sharing.' },
      { endpoint: 'detect_radicalisation', detected: false, level: 'none', risk_score: 0.01, confidence: 0.96, categories: [] },
      { endpoint: 'detect_self_harm', detected: false, level: 'none', risk_score: 0.03, confidence: 0.94, categories: [] },
      { endpoint: 'detect_gambling_harm', detected: false, level: 'none', risk_score: 0.0, confidence: 0.97, categories: [] },
    ],
  },
};

const emotions = {
  toolName: 'analyze_emotions',
  branding: { appName: 'Tuteliq' },
  result: {
    dominant_emotions: ['anxiety', 'sadness', 'shame'],
    emotion_scores: { anxiety: 0.81, sadness: 0.67, shame: 0.54, anger: 0.31, fear: 0.28, joy: 0.05 },
    trend: 'worsening',
    summary:
      'Affect has shifted markedly negative across the analysed window, with anxiety and shame rising together — a pattern often seen where the subject believes they are partly at fault.',
    recommended_followup: 'schedule_wellbeing_check',
  },
};

const media = {
  toolName: 'analyze_voice',
  branding: { appName: 'Tuteliq' },
  result: {
    transcription: {
      text: "I don't want to talk about it, please just leave me alone for a bit.",
      language: 'en',
      duration: 14.2,
      segments: [],
    },
    analysis: {
      emotions: {
        dominant_emotions: ['sadness', 'withdrawal'],
        emotion_scores: { sadness: 0.72, withdrawal: 0.61, anger: 0.18 },
        trend: 'stable',
        summary: 'Flat affect with withdrawal markers.',
        recommended_followup: 'none',
      },
    },
    overall_risk_score: 0.41,
    overall_severity: 'medium',
  },
};

const incidentDetail = {
  result: {
    id: '1a06578a-9f31-4c2b-b8e1-77a3d9e2f001',
    risk_category: 'grooming',
    risk_level: 'critical',
    confidence_score: 0.95,
    detected_patterns: ['isolation', 'secrecy', 'gift_offering', 'meeting_request'],
    emotional_indicators: ['confusion', 'flattery_response'],
    recommended_actions: ['escalate_to_safeguarding', 'preserve_evidence'],
    platform: 'discord',
    language: 'en',
    source: 'text',
    file_id: null,
    status: 'new',
    external_id: 'battery-meetup-risk',
    customer_id: '5caea63a-1f22-4b0e-9a01-2c9f7e3b1d44',
    created_at: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
    summary:
      'Counterparty spent nine days building rapport before proposing an in-person meeting without the guardian present, and repeatedly asked the child to delete the conversation.',
    metadata: null,
    source_data: null,
    review: null,
    message_analysis: Array.from({ length: 12 }, (_, i) => ({
      message_index: i,
      risk_score: [0.05, 0.08, 0.12, 0.18, 0.22, 0.31, 0.44, 0.52, 0.61, 0.74, 0.85, 0.93][i],
      flags: i > 7 ? ['secrecy'] : i > 4 ? ['isolation'] : [],
    })),
  },
};

const synthetic = {
  toolName: 'detect_synthetic_text',
  branding: { appName: 'Tuteliq' },
  result: {
    classification: 'suspected_synthetic',
    confidence: 0.73,
    ai_probability: 0.71,
    human_probability: 0.29,
    indicators: [
      { label: 'Low perplexity variance', tag: 'perplexity', weight: 0.68 },
      { label: 'Uniform sentence length', tag: 'burstiness', weight: 0.52 },
    ],
    summary:
      'Statistical markers are consistent with machine generation, but the sample is short enough that a confident verdict is not available.',
  },
};

const moderationQueue = {
  result: {
    operator_name: 'Acme Trust & Safety',
    in_queue: 47,
    in_queue_is_partial: false,
    reviewed_count: 312,
    avg_review_seconds: 2.3,
    next_item: {
      id: 'INC-29847',
      content: "I've been thinking about ending it all. Nobody would even notice if I disappeared. I feel so isolated and hopeless.",
      user: 'teens_support_group',
      platform: 'Discord',
      age_group: '16',
      status: 'pending analysis',
      risk_category: 'self_harm',
      risk_level: 'critical',
      encrypted: false,
    },
    analysis: [
      { tool: 'detect_distress_signals', note: 'Isolation language detected, hopelessness phrases found', status: 'complete' },
      { tool: 'detect_unsafe', note: 'Self-harm language, suicide ideation patterns', status: 'complete' },
      { tool: 'get_action_plan', note: 'Generated crisis response guidance for teen', status: 'complete' },
      { tool: 'severity assessment', note: 'Determining severity and recommended action', status: 'running' },
    ],
    reasoning:
      'Multiple critical distress signals detected: suicidal ideation ("ending it all"), isolation ("nobody would notice"), and hopelessness ("feel so isolated and hopeless"). Combined with explicit self-harm language and teen age group, this requires immediate human review and crisis intervention.',
    recommended_action: 'escalate',
    confidence: 0.94,
    risk_level: 'critical',
    pattern_match: '3/3',
  },
};

const Backdrop: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div
    style={{
      minHeight: '100vh',
      background: '#0D0D14',
      backgroundImage:
        'radial-gradient(circle at 20% 15%, rgba(25,183,155,0.06), transparent 45%),' +
        'linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),' +
        'linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
      backgroundSize: '100% 100%, 44px 44px, 44px 44px',
      padding: 44,
      display: 'flex',
      flexDirection: 'column',
      gap: 44,
    }}
  >
    {children}
  </div>
);

function Preview() {
  return (
    <Backdrop>
      <IncidentsOverviewPage data={overview as never} />
      <IncidentsListPage data={list as never} />
      <DetectionPage data={detection as never} />
      <IncidentTrendsPage data={trends as never} />
      <ReportPage data={report as never} />
      <ActionPlanPage data={actionPlan as never} />
      <MultiPage data={multi as never} />
      <EmotionsPage data={emotions as never} />
      <MediaPage data={media as never} />
      <IncidentDetailPage data={incidentDetail as never} />
      <SyntheticPage data={synthetic as never} />
      <ModerationQueuePage data={moderationQueue as never} />
      <BrandedLoader message="Analysing content…" />
    </Backdrop>
  );
}

const style = document.createElement('style');
style.textContent = baseStyles;
document.head.appendChild(style);

createRoot(document.getElementById('root')!).render(<Preview />);
