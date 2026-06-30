/**
 * All BullMQ queue names. Must stay in sync with the AgentStep enum
 * and the pipeline state machine in orchestrator/state-machine.ts.
 */
export const QUEUES = {
  CHAR_BUILD: 'agent-char-build',
  STORY_PLAN: 'agent-story-plan',
  CHAPTER_WRITE: 'agent-chapter-write',
  ILLUST_PROMPT: 'agent-illust-prompt',
  CHAR_CONSISTENCY: 'agent-char-consistency',
  IMAGE_GEN: 'agent-image-gen',
  QA_REVIEW: 'agent-qa-review',
  LAYOUT: 'agent-layout',
  PDF_RENDER: 'agent-pdf-render',

  /** Dead-letter queue for unrecoverable failures. */
  DLQ_FAILED: 'dlq-failed',
} as const;

export type QueueName = (typeof QUEUES)[keyof typeof QUEUES];
