/**
 * The fields the widgets read from a tool result, in one place so they can
 * be tested against the response shapes the API serves.
 */

export function multiIsClean(summary: any): boolean {
  return summary.detected_count === 0;
}

export function temporalView(tc: any) {
  return {
    score: tc.temporal_consistency_score,
    identity: tc.identity_consistency_score,
    landmark: tc.landmark_stability_score,
    framesWithFaces: tc.frames_with_faces,
    totalFrames: tc.total_frames,
    anomalousPairs: tc.anomalous_frame_pairs,
  };
}

export function audioRms(stats: any): number | undefined {
  return stats.rms_mean;
}

export function readingLevel(plan: any): string | undefined {
  return plan.reading_level;
}

export function imageSemantic(result: any) {
  return result.vision;
}
