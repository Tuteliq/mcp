import { describe, it, expect } from 'vitest';
import { multiIsClean, temporalView, audioRms, readingLevel, imageSemantic, notAVerdict } from './resultFields';

/** The widgets against the response shapes the API serves (SDK 3.0.0). */
describe('widget fields', () => {
  it('a multi-endpoint run where a detector did not answer is not shown as clean', () => {
    expect(multiIsClean({ detected_count: 0, analysis_status: 'partial', failed_endpoints: [{ endpoint: 'grooming', code: 'E', error: 'e' }] })).toBe(false);
    expect(multiIsClean({ detected_count: 0, analysis_status: 'complete' })).toBe(true);
    expect(multiIsClean({ detected_count: 1 })).toBe(false);
  });

  it('the video timeline reads the served temporal fields', () => {
    const view = temporalView({ score: 0.42, identity_consistency: 0.38, landmark_stability: 0.61, frames_with_faces: 6, anomalous_pairs: [{ frame_a: 2, frame_b: 3, distance: 0.7 }] }, 6);
    expect(view).toMatchObject({ score: 0.42, identity: 0.38, landmark: 0.61, framesWithFaces: 6, totalFrames: 6 });
    expect(view.anomalousPairs).toHaveLength(1);
  });

  it('the audio panel reads rms_level', () => {
    expect(audioRms({ rms_level: -18 })).toBe(-18);
  });

  it('the action plan reads approx_reading_level', () => {
    expect(readingLevel({ approx_reading_level: 'Grade 7' })).toBe('Grade 7');
  });

  it('the synthetic image view reads semantic_analysis', () => {
    expect(imageSemantic({ semantic_analysis: { overall_assessment: 'a' } })).toEqual({ overall_assessment: 'a' });
  });

  it('a grooming result that was not analysed is not a verdict', () => {
    expect(notAVerdict({ analysis_status: 'out_of_scope_adults' })).toBe('out_of_scope');
    expect(notAVerdict({ analysis_status: 'engine_error' })).toBe('engine_error');
    expect(notAVerdict({ analysis_status: 'ok' })).toBeNull();
  });
});
