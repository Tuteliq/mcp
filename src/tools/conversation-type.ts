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

const PARTICIPANT_ROLES = ['child', 'teen', 'adult', 'guardian', 'educator', 'staff', 'unknown'] as const;
const PARTICIPANT_RELATIONSHIPS = [
  'guardian_of_sender', 'child_of_sender', 'sibling', 'peer', 'educator_of_sender', 'student_of_sender', 'staff', 'none', 'unknown',
] as const;

const participantFields = {
  role: z.enum(PARTICIPANT_ROLES).optional().describe('Who this participant is on your platform'),
  age_group: z.string().optional().describe('This participant\'s age group, e.g. "8-10"'),
};

/**
 * The declared participants and the opt-in minor disclosure reading, accepted
 * by every text detection endpoint. Like `conversation_type`, they are what
 * the platform knows from its own records, never what the text claims.
 */
export const declaredContextFields = {
  conversation_type: conversationTypeField,
  sender: z.object(participantFields).optional().describe(
    'Optional. The sender, as declared by your platform from its own records, never inferred from the text.',
  ),
  recipients: z.array(z.object({
    ...participantFields,
    relationship_to_sender: z.enum(PARTICIPANT_RELATIONSHIPS).optional().describe('How this recipient is related to the sender'),
  })).max(20).optional().describe(
    'Optional. Up to 20 recipients and how each is related to the sender, as declared by your platform from its own records, never inferred from the text.',
  ),
  minor_disclosure_check: z.boolean().optional().describe(
    'Optional. Also read whether the speaker says they are a minor in words other than an age (a school year, a parental control). Returned as `minor_disclosure`, with an age group your platform can send back as `context.age_group` on that user\'s later requests.',
  ),
};

type DeclaredParticipant = { role?: string; age_group?: string; relationship_to_sender?: string };

/**
 * The tool's snake_case `context` as the SDK's `ContextInput`.
 *
 * The tools take the API's wire keys, so a context reads the same in a tool
 * call as in the API reference. The SDK takes camelCase for the declared
 * fields and translates them back; every other key passes through as given.
 */
export function toSdkContext(context: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!context) return undefined;
  const { sender, recipients, conversation_type, minor_disclosure_check, author_role, ...rest } = context as Record<string, unknown> & {
    sender?: DeclaredParticipant; recipients?: DeclaredParticipant[];
  };
  const participant = (p: DeclaredParticipant) => ({
    ...(p.role && { role: p.role }),
    ...(p.age_group && { ageGroup: p.age_group }),
    ...(p.relationship_to_sender && { relationshipToSender: p.relationship_to_sender }),
  });
  return {
    ...rest,
    ...(sender && { sender: participant(sender) }),
    ...(recipients && { recipients: recipients.map(participant) }),
    ...(conversation_type !== undefined && { conversationType: conversation_type }),
    ...(minor_disclosure_check !== undefined && { minorDisclosureCheck: minor_disclosure_check }),
    ...(author_role !== undefined && { authorRole: author_role }),
  };
}

/** `attestation` and `message_id`, accepted by the single-endpoint text detectors. */
export const textDetectionFields = {
  attestation: z.boolean().optional().describe(
    'Optional. Ask for a signed, non-identifying attestation of what was detected, returned as `attestation` on the result (null with `attestation_reason` when none could be produced).',
  ),
  message_id: z.string().max(128).optional().describe('Optional. Your id for this message (max 128 characters).'),
};
