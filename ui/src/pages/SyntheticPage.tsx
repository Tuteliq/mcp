import React, { useState } from 'react';
import { AppWrapper } from '../App';
import { colors, fontFamily, severityColor } from '../theme';
import { RiskGauge } from '../components/RiskGauge';
import { ConfidenceBar } from '../components/ConfidenceBar';
import { CategoryChips } from '../components/CategoryChips';
import { SeverityBadge } from '../components/SeverityBadge';
import { ClassificationBanner } from '../components/ClassificationBanner';
import { ForensicSignalGrid } from '../components/ForensicSignalGrid';
import { AudioStatsPanel } from '../components/AudioStatsPanel';
import { TemporalTimeline } from '../components/TemporalTimeline';
import { LipSyncMeter } from '../components/LipSyncMeter';
import { ProfileDonut } from '../components/ProfileDonut';
import type { ToolResultPayload } from '../types';

// ── Shared styles ──────────────────────────────────────────────────────────────

const syntheticKeyframes = `
@keyframes synth-fadeSlideDown {
  from { opacity: 0; transform: translateY(-12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes synth-fadeSlideUp {
  from { opacity: 0; transform: translateY(12px); }
  to { opacity: 1; transform: translateY(0); }
}
@keyframes synth-fadeSlideRight {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: translateX(0); }
}
@keyframes synth-barGrow {
  from { transform: scaleX(0); }
  to { transform: scaleX(1); }
}
@keyframes synth-pulseGlow {
  0%, 100% { box-shadow: 0 0 0 0 rgba(217,79,61,0.4); }
  50% { box-shadow: 0 0 8px 3px rgba(217,79,61,0.25); }
}
@keyframes synth-bannerPulse {
  0%, 100% { box-shadow: 0 4px 16px rgba(0,0,0,0.15); }
  50% { box-shadow: 0 4px 24px rgba(0,0,0,0.25); }
}
@keyframes synth-dotAppear {
  from { transform: scale(0); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
@keyframes synth-donutSegment {
  from { opacity: 0; stroke-dashoffset: 301.6; }
  to { opacity: 1; stroke-dashoffset: 0; }
}
@keyframes synth-markerSlide {
  from { opacity: 0; }
  to { opacity: 1; }
}
@keyframes synth-chipSlide {
  from { opacity: 0; transform: translateX(-8px); }
  to { opacity: 1; transform: translateX(0); }
}
.synth-banner-pulse { animation: synth-bannerPulse 3s ease-in-out infinite !important; }
`;

const cardStyle: React.CSSProperties = {
  background: 'rgba(255,255,255,0.7)',
  backdropFilter: 'blur(8px)',
  borderRadius: 10,
  padding: 16,
  boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
  marginBottom: 12,
};

const sectionLabelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: colors.text.primary,
  fontFamily,
  marginBottom: 8,
  display: 'flex',
  alignItems: 'center',
  gap: 6,
};

// ── Helpers ────────────────────────────────────────────────────────────────────

function toolTitle(toolName: string): string {
  const map: Record<string, string> = {
    detect_synthetic_text: 'Synthetic Text Detection',
    detect_synthetic_image: 'Synthetic Image Detection',
    detect_synthetic_audio: 'Synthetic Audio Detection',
    detect_synthetic_video: 'Synthetic Video Detection',
    get_synthetic_profile: 'Synthetic Profile',
  };
  return map[toolName] || 'Synthetic Content Detection';
}

// ── Animated Category Chips ────────────────────────────────────────────────────

function AnimatedCategoryChips({ categories }: { categories: Array<{ tag: string; label: string; confidence: number }> }) {
  if (!categories || categories.length === 0) return null;
  return (
    <div style={{ marginBottom: 12, animation: 'synth-fadeSlideUp 0.5s ease 0.25s both' }}>
      <div style={sectionLabelStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primaryLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" />
          <line x1="7" y1="7" x2="7.01" y2="7" />
        </svg>
        Categories
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {categories.map((c, i) => (
          <span
            key={i}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              borderRadius: 10,
              fontSize: 11,
              fontWeight: 500,
              color: colors.brand.primary,
              background: '#E6F5F3',
              border: '1px solid #A7DDD5',
              fontFamily,
              animation: `synth-chipSlide 0.3s ease ${0.3 + i * 0.06}s both`,
            }}
          >
            {c.label || c.tag}
            <span
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: colors.brand.primaryLight,
                background: 'rgba(42,157,143,0.12)',
                padding: '1px 5px',
                borderRadius: 6,
              }}
            >
              {Math.round(c.confidence * 100)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ── Score Panel (Gauge + Confidence side by side) ──────────────────────────────

function ScorePanel({ risk_score, confidence, level }: { risk_score: number; confidence: number; level: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        marginBottom: 14,
        animation: 'synth-fadeSlideUp 0.5s ease 0.15s both',
      }}
    >
      <RiskGauge score={risk_score} level={level} />
      <div style={{ flex: 1 }}>
        <ConfidenceBar value={confidence} label="Detection Confidence" />
        <div style={{ marginTop: 8 }}>
          <SeverityBadge level={level} />
        </div>
      </div>
    </div>
  );
}

// ── Rationale Card ─────────────────────────────────────────────────────────────

function RationaleCard({ rationale, delay = 0.5 }: { rationale: string; delay?: number }) {
  return (
    <div style={{ ...cardStyle, animation: `synth-fadeSlideUp 0.5s ease ${delay}s both` }}>
      <div style={sectionLabelStyle}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primaryLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        Analysis Rationale
      </div>
      <p style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 1.7, fontFamily, margin: 0 }}>
        {rationale}
      </p>
    </div>
  );
}

// ── Action Badge ───────────────────────────────────────────────────────────────

function ActionBadge({ action, delay = 0.6 }: { action: string; delay?: number }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '10px 14px',
        borderRadius: 10,
        background: `linear-gradient(135deg, ${colors.brand.primary}08, ${colors.brand.primaryLight}12)`,
        border: `1px solid ${colors.brand.primaryLight}30`,
        marginBottom: 12,
        animation: `synth-fadeSlideUp 0.5s ease ${delay}s both`,
      }}
    >
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: 8,
          background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.primaryLight})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="9 11 12 14 22 4" />
          <path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11" />
        </svg>
      </div>
      <div>
        <div style={{ fontSize: 10, fontWeight: 600, color: colors.text.muted, fontFamily, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          Recommended Action
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: colors.text.primary, fontFamily }}>{action}</div>
      </div>
    </div>
  );
}

// ── Expandable Section ─────────────────────────────────────────────────────────

function Expandable({ title, icon, children, delay = 0.4 }: { title: string; icon: React.ReactNode; children: React.ReactNode; delay?: number }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ ...cardStyle, animation: `synth-fadeSlideUp 0.5s ease ${delay}s both`, padding: 0, overflow: 'hidden' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '12px 16px',
          fontFamily,
          fontSize: 12,
          fontWeight: 600,
          color: colors.text.primary,
        }}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          style={{ transform: open ? 'rotate(90deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
        {icon}
        {title}
      </button>
      {open && (
        <div style={{ padding: '0 16px 14px 16px', animation: 'synth-fadeSlideDown 0.3s ease both' }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ══ View: Text ═══════════════════════════════════════════════════════════════

function SyntheticTextView({ result }: { result: any }) {
  return (
    <>
      <ClassificationBanner classification={result.classification} />
      <ScorePanel risk_score={result.risk_score} confidence={result.confidence} level={result.level} />
      <AnimatedCategoryChips categories={result.categories} />
      <RationaleCard rationale={result.rationale} />
      <ActionBadge action={result.recommended_action} />
      {result.credits_used != null && (
        <div style={{ fontSize: 10, color: colors.text.muted, textAlign: 'right', fontFamily, animation: 'synth-fadeSlideUp 0.5s ease 0.7s both' }}>
          Credits used: {result.credits_used}
        </div>
      )}
    </>
  );
}

// ══ View: Image ══════════════════════════════════════════════════════════════

function SyntheticImageView({ result }: { result: any }) {
  const meta = result.metadata_analysis;
  const prov = result.provenance;
  const vision = result.vision;
  const forensic = result.forensic_signals;

  return (
    <>
      <ClassificationBanner classification={result.classification} />
      <ScorePanel risk_score={result.risk_score} confidence={result.confidence} level={result.level} />

      {/* Forensic Signal Grid */}
      {forensic && forensic.sources && forensic.sources.length > 0 && (
        <ForensicSignalGrid
          sources={forensic.sources}
          totalSignals={forensic.signal_count}
          combinedBoost={forensic.combined_confidence_boost}
        />
      )}

      <AnimatedCategoryChips categories={result.categories} />

      {/* Vision details expandable */}
      {vision && (
        <Expandable
          title="Vision AI Details"
          delay={0.4}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primaryLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          }
        >
          <div style={{ fontSize: 12, color: colors.text.secondary, lineHeight: 1.7, fontFamily }}>
            <div style={{ marginBottom: 8 }}>
              <span style={{ fontWeight: 600 }}>Assessment: </span>
              {vision.overall_assessment}
            </div>
            {vision.face_analysis && (
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontWeight: 600 }}>Face Analysis: </span>
                {vision.face_analysis}
              </div>
            )}
            {vision.artifacts && vision.artifacts.length > 0 && (
              <div>
                <span style={{ fontWeight: 600 }}>Artifacts: </span>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 4 }}>
                  {vision.artifacts.map((a: string, i: number) => (
                    <span
                      key={i}
                      style={{
                        padding: '2px 8px',
                        borderRadius: 6,
                        fontSize: 10,
                        background: `${colors.severity.medium}15`,
                        color: colors.severity.medium,
                        border: `1px solid ${colors.severity.medium}30`,
                        fontFamily,
                      }}
                    >
                      {a}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 600 }}>Synthetic Confidence: </span>
              <span style={{ fontWeight: 700, color: vision.is_likely_synthetic ? colors.severity.high : colors.severity.safe }}>
                {Math.round(vision.synthetic_confidence * 100)}%
              </span>
            </div>
          </div>
        </Expandable>
      )}

      {/* Metadata card */}
      {meta && (
        <Expandable
          title="Metadata / EXIF"
          delay={0.45}
          icon={
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.brand.primaryLight} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <line x1="3" y1="9" x2="21" y2="9" />
              <line x1="9" y1="21" x2="9" y2="9" />
            </svg>
          }
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 16px', fontSize: 11, fontFamily }}>
            <MetaRow label="Format" value={meta.format} />
            {meta.dimensions && <MetaRow label="Size" value={`${meta.dimensions.width} x ${meta.dimensions.height}`} />}
            <MetaRow label="EXIF Data" value={meta.has_exif ? 'Present' : 'Missing'} warn={!meta.has_exif && meta.suspicious_absence} />
            <MetaRow label="Camera Info" value={meta.has_camera ? (meta.camera_model || 'Present') : 'Missing'} warn={!meta.has_camera && meta.suspicious_absence} />
            <MetaRow label="GPS" value={meta.has_gps ? 'Present' : 'None'} />
            {meta.ai_generator_detected && (
              <MetaRow label="AI Generator" value={meta.ai_generator || 'Detected'} warn />
            )}
          </div>
        </Expandable>
      )}

      {/* Provenance badge */}
      {prov && prov.has_c2pa && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '10px 14px',
            borderRadius: 10,
            background: prov.is_ai_generated ? `${colors.severity.high}08` : `${colors.severity.safe}12`,
            border: `1px solid ${prov.is_ai_generated ? colors.severity.high : colors.severity.safe}30`,
            marginBottom: 12,
            animation: 'synth-fadeSlideUp 0.5s ease 0.5s both',
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={prov.is_ai_generated ? colors.severity.high : colors.severity.safe} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <polyline points="9 12 11 14 15 10" />
          </svg>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: colors.text.primary, fontFamily }}>
              C2PA Provenance {prov.is_ai_generated ? '- AI Generated' : '- Verified'}
            </div>
            {prov.claim_generator && (
              <div style={{ fontSize: 10, color: colors.text.muted, fontFamily }}>{prov.claim_generator}</div>
            )}
            {prov.ai_tool && (
              <div style={{ fontSize: 10, color: colors.text.muted, fontFamily }}>Tool: {prov.ai_tool}</div>
            )}
          </div>
        </div>
      )}

      {/* pHash + known match */}
      {result.perceptual_hash && (
        <div style={{ fontSize: 10, color: colors.text.muted, fontFamily, marginBottom: 4, animation: 'synth-fadeSlideUp 0.5s ease 0.55s both' }}>
          pHash: <code style={{ fontFamily: 'monospace', fontSize: 10, background: colors.bg.secondary, padding: '1px 4px', borderRadius: 3 }}>{result.perceptual_hash}</code>
          {result.known_synthetic_match && (
            <span style={{ marginLeft: 8, color: colors.severity.high, fontWeight: 600 }}>
              Known match: {result.known_synthetic_match.category} (distance: {result.known_synthetic_match.distance})
            </span>
          )}
        </div>
      )}

      {/* CSAM compositional risk assessment */}
      {result.csam_assessment && (
        <CsamPanel csam={result.csam_assessment} />
      )}

      <RationaleCard rationale={result.rationale} delay={0.6} />
      <ActionBadge action={result.recommended_action} delay={0.7} />
    </>
  );
}

function CsamPanel({ csam }: { csam: any }) {
  const level: string = csam.risk_level || 'none';
  const isEscalated = level === 'critical' || level === 'high';
  const isElevated = level === 'elevated';
  const levelColor =
    level === 'critical' ? colors.severity.critical :
    level === 'high'     ? colors.severity.high     :
    level === 'elevated' ? colors.severity.medium   :
    level === 'low'      ? colors.severity.low      :
                           colors.severity.safe;
  const labelText = {
    critical: 'CSAM risk — CRITICAL',
    high:     'CSAM risk — HIGH',
    elevated: 'CSAM risk — Elevated',
    low:      'CSAM signals — Low',
    none:     'CSAM screening — Clear',
  }[level] || 'CSAM screening';

  return (
    <div
      style={{
        marginBottom: 14,
        padding: '12px 14px',
        borderRadius: 12,
        background: `${levelColor}0F`,
        border: `1px solid ${levelColor}44`,
        animation: 'synth-fadeSlideUp 0.5s ease 0.55s both',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: isEscalated || isElevated ? 10 : 0 }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={levelColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          {isEscalated ? <line x1="12" y1="8" x2="12" y2="13" /> : <polyline points="9 12 11 14 15 10" />}
          {isEscalated && <line x1="12" y1="16" x2="12" y2="16" />}
        </svg>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: colors.text.primary, fontFamily }}>{labelText}</div>
          <div style={{ fontSize: 10, color: colors.text.muted, fontFamily }}>
            risk score {(csam.risk_score ?? 0).toFixed(2)} · {csam.requires_escalation ? 'escalation required' : csam.requires_review ? 'review recommended' : 'no action'}
          </div>
        </div>
        {csam.uncertainty_score != null && (
          <div style={{
            fontSize: 9,
            color: colors.text.muted,
            background: `${levelColor}1A`,
            border: `1px solid ${levelColor}33`,
            borderRadius: 6,
            padding: '2px 6px',
            fontFamily,
          }}>
            uncertainty {(csam.uncertainty_score ?? 0).toFixed(2)}
          </div>
        )}
      </div>

      {(isEscalated || isElevated) && csam.recommendation && (
        <div style={{
          fontSize: 11,
          color: colors.text.primary,
          background: `${levelColor}14`,
          border: `1px dashed ${levelColor}55`,
          borderRadius: 8,
          padding: '8px 10px',
          marginBottom: 10,
          fontFamily,
          lineHeight: 1.5,
        }}>
          {csam.recommendation}
        </div>
      )}

      {isEscalated && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '8px 10px',
          marginBottom: 10,
          borderRadius: 8,
          background: `${levelColor}1A`,
          border: `1px solid ${levelColor}66`,
          fontFamily,
        }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={levelColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <div style={{ flex: 1, fontSize: 11, color: colors.text.primary, lineHeight: 1.5 }}>
            Report suspected CSAM to the Internet Watch Foundation —{' '}
            <a
              href="https://report.iwf.org.uk/org/report"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: levelColor, fontWeight: 700, textDecoration: 'underline' }}
            >
              report.iwf.org.uk
            </a>
            . US-based reporters should also notify NCMEC CyberTipline at{' '}
            <a
              href="https://report.cybertip.org"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: levelColor, fontWeight: 700, textDecoration: 'underline' }}
            >
              report.cybertip.org
            </a>
            . Preserve evidence; do not distribute.
          </div>
        </div>
      )}

      {Array.isArray(csam.signals) && csam.signals.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
          {csam.signals.map((s: string, i: number) => (
            <span key={i} style={{
              padding: '2px 8px',
              borderRadius: 6,
              fontSize: 10,
              background: `${levelColor}1A`,
              color: colors.text.primary,
              border: `1px solid ${levelColor}33`,
              fontFamily,
            }}>{s}</span>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '6px 12px', fontSize: 10, fontFamily }}>
        {csam.age_signal && (
          <CsamMini
            label="Age signal"
            value={
              csam.age_signal.youngest_age_group
                ? `${csam.age_signal.youngest_age_group}${csam.age_signal.youngest_age != null ? ` (~${Math.round(csam.age_signal.youngest_age)}y)` : ''}`
                : csam.age_signal.face_count > 0 ? 'detected' : 'no face'
            }
            warn={csam.age_signal.minor_detected || csam.age_signal.child_detected}
          />
        )}
        {csam.nudity_signal && (
          <CsamMini
            label="Nudity signal"
            value={
              csam.nudity_signal.is_explicit ? 'explicit'
              : csam.nudity_signal.is_suggestive ? 'suggestive'
              : 'none'
            }
            warn={csam.nudity_signal.is_explicit}
          />
        )}
        {csam.synthetic_signal && (
          <CsamMini
            label="Synthetic signal"
            value={
              csam.synthetic_signal.is_synthetic ? 'synthetic'
              : csam.synthetic_signal.classification || 'unknown'
            }
            warn={csam.synthetic_signal.is_synthetic}
          />
        )}
      </div>

      {(level === 'none' || level === 'low') && (
        <div style={{ fontSize: 10, color: colors.text.muted, fontFamily, marginTop: 8 }}>
          Composite scoring across face-age, anatomical nudity, body proportions, framing, and synthetic provenance. Adult-only content with no minor signals is screened out before LLM analysis.
        </div>
      )}
    </div>
  );
}

function CsamMini({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div>
      <div style={{ color: colors.text.muted, fontSize: 9, textTransform: 'uppercase', letterSpacing: 0.4 }}>{label}</div>
      <div style={{
        fontWeight: 600,
        color: warn ? colors.severity.high : colors.text.primary,
        marginTop: 2,
      }}>{value}</div>
    </div>
  );
}

function MetaRow({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <>
      <span style={{ color: colors.text.muted }}>{label}</span>
      <span style={{ fontWeight: 600, color: warn ? colors.severity.high : colors.text.primary }}>{value}</span>
    </>
  );
}

// ══ View: Audio ══════════════════════════════════════════════════════════════

function SyntheticAudioView({ result }: { result: any }) {
  return (
    <>
      <ClassificationBanner classification={result.classification} />
      <ScorePanel risk_score={result.risk_score} confidence={result.confidence} level={result.level} />

      {result.audio_stats && (
        <AudioStatsPanel
          stats={result.audio_stats}
          spectralSignals={result.spectral_signals}
          transcription={result.transcription}
        />
      )}

      <AnimatedCategoryChips categories={result.categories} />
      <RationaleCard rationale={result.rationale} delay={0.55} />
      <ActionBadge action={result.recommended_action} delay={0.65} />
    </>
  );
}

// ══ View: Video ══════════════════════════════════════════════════════════════

function SyntheticVideoView({ result }: { result: any }) {
  const video = result.video;

  return (
    <>
      <ClassificationBanner classification={result.classification} />
      <ScorePanel risk_score={result.risk_score} confidence={result.confidence} level={result.level} />

      {/* Video meta bar */}
      {video && (
        <div
          style={{
            display: 'flex',
            gap: 12,
            marginBottom: 14,
            animation: 'synth-fadeSlideUp 0.5s ease 0.25s both',
          }}
        >
          {[
            { label: 'Duration', value: `${video.duration_seconds.toFixed(1)}s`, icon: 'clock' },
            { label: 'Frames', value: String(video.frames_analyzed), icon: 'film' },
            { label: 'Audio', value: video.has_audio ? 'Present' : 'None', icon: 'volume' },
          ].map((item, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(8px)',
                borderRadius: 10,
                padding: '10px 12px',
                textAlign: 'center',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 700, color: colors.text.primary, fontFamily }}>{item.value}</div>
              <div style={{ fontSize: 9, color: colors.text.muted, fontFamily }}>{item.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Temporal Timeline */}
      {result.temporal_consistency && (
        <TemporalTimeline data={result.temporal_consistency} />
      )}

      {/* Lip Sync */}
      {result.lip_sync && (
        <LipSyncMeter data={result.lip_sync} />
      )}

      {/* Spectral signals */}
      {result.spectral_signals && result.spectral_signals.length > 0 && (
        <div style={{ marginBottom: 14, animation: 'synth-fadeSlideUp 0.5s ease 0.55s both' }}>
          <div style={sectionLabelStyle}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={colors.severity.medium} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
            Spectral Anomalies
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {result.spectral_signals.map((sig: string, i: number) => (
              <span
                key={i}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '3px 10px',
                  borderRadius: 8,
                  fontSize: 10,
                  fontWeight: 500,
                  color: colors.severity.medium,
                  background: 'rgba(232,168,92,0.12)',
                  border: '1px solid rgba(232,168,92,0.25)',
                  fontFamily,
                  animation: `synth-fadeSlideRight 0.3s ease ${0.6 + i * 0.06}s both`,
                }}
              >
                <span style={{ width: 4, height: 4, borderRadius: '50%', background: colors.severity.medium }} />
                {sig}
              </span>
            ))}
          </div>
        </div>
      )}

      <AnimatedCategoryChips categories={result.categories} />
      <RationaleCard rationale={result.rationale} delay={0.6} />
      <ActionBadge action={result.recommended_action} delay={0.7} />
    </>
  );
}

// ══ View: Profile ════════════════════════════════════════════════════════════

function SyntheticProfileView({ result }: { result: any }) {
  return (
    <>
      <ProfileDonut profile={result} />
    </>
  );
}

// ══ Main Page ════════════════════════════════════════════════════════════════

interface SyntheticPageProps {
  data: ToolResultPayload;
  viewUUID?: string;
}

export function SyntheticPage({ data }: SyntheticPageProps) {
  const { toolName, result } = data;

  let content: React.ReactNode;
  switch (toolName) {
    case 'detect_synthetic_text':
      content = <SyntheticTextView result={result} />;
      break;
    case 'detect_synthetic_image':
      content = <SyntheticImageView result={result} />;
      break;
    case 'detect_synthetic_audio':
      content = <SyntheticAudioView result={result} />;
      break;
    case 'detect_synthetic_video':
      content = <SyntheticVideoView result={result} />;
      break;
    case 'get_synthetic_profile':
      content = <SyntheticProfileView result={result} />;
      break;
    default:
      content = (
        <div style={{ padding: 16, fontSize: 13, color: colors.text.secondary, fontFamily }}>
          Unknown synthetic tool: {toolName}
        </div>
      );
  }

  return (
    <AppWrapper title={toolTitle(toolName)}>
      <style>{syntheticKeyframes}</style>
      {content}
    </AppWrapper>
  );
}
