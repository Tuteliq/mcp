/**
 * The fields the widgets read from a tool result, in one place so they can
 * be tested against the response shapes the API serves.
 */

/**
 * A multi-endpoint run is clean only when every detector answered and none
 * flagged. A detector that did not answer has not cleared the content.
 */
export function multiIsClean(summary: any): boolean {
  if (summary.analysis_status === 'partial') return false;
  if (Array.isArray(summary.failed_endpoints) && summary.failed_endpoints.length > 0) return false;
  return summary.detected_count === 0;
}

/**
 * Synthetic video face consistency. The API serves `score`,
 * `identity_consistency`, `landmark_stability` and `anomalous_pairs`; the
 * older names are read only as a fallback. The frame total comes from
 * `video.frames_analyzed`, which the caller passes in.
 */
export function temporalView(tc: any, framesAnalyzed?: number) {
  const framesWithFaces: number = tc.frames_with_faces ?? 0;
  return {
    score: tc.score ?? tc.temporal_consistency_score,
    identity: tc.identity_consistency ?? tc.identity_consistency_score,
    landmark: tc.landmark_stability ?? tc.landmark_stability_score,
    framesWithFaces,
    totalFrames: framesAnalyzed ?? tc.total_frames ?? framesWithFaces,
    anomalousPairs: (tc.anomalous_pairs ?? tc.anomalous_frame_pairs ?? []) as Array<{ frame_a: number; frame_b: number; distance: number }>,
  };
}

export function audioRms(stats: any): number | undefined {
  return stats.rms_level ?? stats.rms_mean;
}

export function readingLevel(plan: any): string | undefined {
  return plan.approx_reading_level ?? plan.reading_level;
}

export function imageSemantic(result: any) {
  return result.semantic_analysis ?? result.vision;
}

/**
 * Why a detection result is not a verdict, or null when it is one. Neither
 * case is an all-clear: an engine failure produced no verdict, and an
 * out-of-scope conversation was not analysed at all.
 */
export function notAVerdict(result: any): 'engine_error' | 'out_of_scope' | null {
  if (result?.analysis_status === 'engine_error') return 'engine_error';
  if (result?.analysis_status === 'out_of_scope_adults') return 'out_of_scope';
  return null;
}
