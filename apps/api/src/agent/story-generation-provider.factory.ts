import { MockStoryGenerationProvider, type StoryGenerationProvider } from './story-generation-provider';
import { OpenAIStoryGenerationProvider } from './openai-story-generation-provider';

export type StoryGenerationProviderName = 'mock' | 'openai';

/**
 * Selects the StoryGenerationProvider implementation from env. Defaults to
 * mock so local dev, tests, and CI never depend on a real API key unless
 * STORY_GENERATION_PROVIDER=openai is explicitly set. Takes an explicit env
 * map (defaulting to process.env) so provider selection is unit-testable
 * without mutating global state.
 */
export function createStoryGenerationProvider(
  env: NodeJS.ProcessEnv = process.env,
): StoryGenerationProvider {
  const raw = env['STORY_GENERATION_PROVIDER']?.trim().toLowerCase();

  if (!raw || raw === 'mock') {
    return new MockStoryGenerationProvider();
  }

  if (raw !== 'openai') {
    throw new Error(`Unknown STORY_GENERATION_PROVIDER "${raw}" (expected "mock" or "openai")`);
  }

  const apiKey = env['OPENAI_API_KEY'];
  if (!apiKey) {
    throw new Error('STORY_GENERATION_PROVIDER=openai requires OPENAI_API_KEY to be set');
  }

  return new OpenAIStoryGenerationProvider({
    apiKey,
    ...(env['OPENAI_MODEL'] && { model: env['OPENAI_MODEL'] }),
  });
}
