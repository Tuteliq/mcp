import { z } from 'zod';

/**
 * `context.conversation_type`: the setting a conversation was captured in,
 * declared by the platform. The API has accepted it on every endpoint below
 * since the protective-speech work; no tool here advertised it, so an
 * assistant on the hosted connector had no way to declare a helpline a
 * helpline, and an independent evaluation could not exercise it (2026-09).
 *
 * The values and the description mirror the API's CONVERSATION_TYPES and
 * CONVERSATION_TYPE_DESCRIPTION (src/services/llm/conversationContext.ts in
 * the api repo). A value the API does not know is rejected there with a 400,
 * so keep the two in step when either changes.
 */
export const CONVERSATION_TYPES = [
  // Harm discussed, not enacted: an urgent action is capped to review.
  'fraud_report', 'abuse_report', 'support_disclosure', 'helpline', 'clinical', 'investigative',
  'legal', 'advisory', 'training', 'journalism', 'research', 'moderation_review',
  // A professional or a responsible adult is the other party.
  'healthcare', 'law_enforcement', 'education', 'family',
  // A platform whose users are adults.
  'workplace', 'dating', 'adult_community',
  // Ordinary settings: these change nothing.
  'direct_message', 'group_chat', 'public_post', 'customer_service', 'gaming_chat',
] as const;

export const conversationTypeField = z.enum(CONVERSATION_TYPES).optional().describe(
  'Optional, no default: omit it and behaviour is unchanged. The setting this conversation was captured in, declared by your '
  + 'platform from its own configuration, never from end-user input or from what the text claims about itself. '
  + 'A declared setting names the responsible party in the conversation: a counsellor or helpline worker (`helpline`, `clinical`), '
  + 'a clinician (`healthcare`), an officer or investigator (`law_enforcement`, `investigative`), an adviser taking a report '
  + '(`fraud_report`, `abuse_report`, `support_disclosure`, `advisory`), a moderator (`moderation_review`), a lawyer, trainer, '
  + 'journalist or researcher (`legal`, `training`, `journalism`, `research`), a teacher, tutor or safeguarding lead (`education`), '
  + 'a parent or guardian (`family`). Where the harm is discussed and not enacted, an urgent action is capped to `flag_for_review` '
  + 'and the result says "Conversation type applied". The score is never lowered. Harm being done in the conversation and anything '
  + 'acute still alert as with no setting. `direct_message`, `group_chat`, `public_post`, `customer_service` and `gaming_chat` change nothing.',
);
