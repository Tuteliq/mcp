export interface DetectionCategory {
  tag: string;
  label: string;
  confidence: number;
}

export interface DetectionEvidence {
  text: string;
  tactic: string;
  weight: number;
}

export interface AgeCalibration {
  applied: boolean;
  age_group?: string;
  multiplier?: number;
}

export interface MessageAnalysis {
  message_index: number;
  risk_score: number;
  flags: string[];
  summary: string;
}

export interface DetectionResult {
  endpoint: string;
  detected: boolean;
  severity: number;
  confidence: number;
  risk_score: number;
  level: string;
  categories: DetectionCategory[];
  evidence?: DetectionEvidence[];
  age_calibration?: AgeCalibration;
  message_analysis?: MessageAnalysis[];
  recommended_action: string;
  rationale: string;
}

export interface BullyingResult {
  is_bullying: boolean;
  bullying_type: string[];
  confidence: number;
  severity: string;
  rationale: string;
  recommended_action: string;
  risk_score: number;
}

export interface GroomingResult {
  grooming_risk: string;
  confidence: number;
  flags: string[];
  rationale: string;
  risk_score: number;
  recommended_action: string;
  message_analysis?: MessageAnalysis[];
}

export interface UnsafeResult {
  unsafe: boolean;
  categories: string[];
  severity: string;
  confidence: number;
  risk_score: number;
  rationale: string;
  recommended_action: string;
}

export interface AnalyzeResult {
  risk_level: string;
  risk_score: number;
  summary: string;
  bullying?: BullyingResult;
  unsafe?: UnsafeResult;
  recommended_action: string;
}

export interface EmotionsResult {
  dominant_emotions: string[];
  emotion_scores: Record<string, number>;
  trend: string;
  summary: string;
  recommended_followup: string;
}

export interface ActionPlanResult {
  audience: string;
  steps: string[];
  tone: string;
  reading_level?: string;
}

export interface ReportResult {
  summary: string;
  risk_level: string;
  categories: string[];
  recommended_next_steps: string[];
}

export interface AnalyseMultiSummary {
  total_endpoints: number;
  detected_count: number;
  highest_risk: { endpoint: string; risk_score: number };
  overall_risk_level: string;
}

export interface AnalyseMultiResult {
  results: DetectionResult[];
  summary: AnalyseMultiSummary;
  cross_endpoint_modifier?: number;
}

export interface TranscriptionSegment {
  start: number;
  end: number;
  text: string;
}

export interface VoiceAnalysisResult {
  transcription: {
    text: string;
    language: string;
    duration: number;
    segments: TranscriptionSegment[];
  };
  analysis: {
    bullying?: BullyingResult;
    unsafe?: UnsafeResult;
    grooming?: GroomingResult;
    emotions?: EmotionsResult;
  };
  overall_risk_score: number;
  overall_severity: string;
}

export interface VideoSafetyFinding {
  frame_index: number;
  timestamp: number;
  description: string;
  categories: string[];
  severity: number;
}

export interface VideoAnalysisResult {
  frames_analyzed: number;
  safety_findings: VideoSafetyFinding[];
  overall_risk_score: number;
  overall_severity: string;
}

export interface ImageAnalysisResult {
  vision: {
    extracted_text: string;
    visual_categories: string[];
    visual_severity: string;
    visual_confidence: number;
    visual_description: string;
    contains_text: boolean;
    contains_faces: boolean;
  };
  text_analysis?: {
    bullying?: BullyingResult;
    unsafe?: UnsafeResult;
    emotions?: EmotionsResult;
  };
  overall_risk_score: number;
  overall_severity: string;
}

export interface SupportHelpline {
  name: string;
  number: string;
  description?: string;
  category: string;
  available?: string;
}

export interface SupportResponseGuide {
  category: string;
  immediateActions: string[];
  resources: Array<{ name: string; description?: string; url?: string }>;
}

export interface SupportData {
  country: string;
  country_name?: string;
  emergency_number?: string;
  helplines: SupportHelpline[];
  response_guide?: SupportResponseGuide;
}

export interface ToolResultPayload {
  toolName: string;
  result: any;
  branding: { appName: string };
}
