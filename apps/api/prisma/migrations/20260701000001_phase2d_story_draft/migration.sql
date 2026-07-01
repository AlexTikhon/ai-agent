-- AlterEnum: add story_draft to AgentStep
ALTER TYPE "AgentStep" ADD VALUE 'story_draft';

-- AlterEnum: add story_draft to BookStatus
ALTER TYPE "BookStatus" ADD VALUE 'story_draft';
