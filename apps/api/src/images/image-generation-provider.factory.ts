import {
  MockImageGenerationProvider,
  type ImageGenerationProvider,
} from './image-generation-provider';
import { OpenAIImageGenerationProvider } from './openai-image-generation-provider';

export type ImageGenerationProviderName = 'mock' | 'openai';

/**
 * Selects the ImageGenerationProvider implementation from env. Defaults to
 * mock so local dev, tests, and CI never depend on a real API key unless
 * IMAGE_GENERATION_PROVIDER_TOKEN=openai is explicitly set. Takes an
 * explicit env map (defaulting to process.env) so provider selection is
 * unit-testable without mutating global state.
 */
export function createImageGenerationProvider(
  env: NodeJS.ProcessEnv = process.env,
): ImageGenerationProvider {
  const raw = env['IMAGE_GENERATION_PROVIDER_TOKEN']?.trim().toLowerCase();

  if (!raw || raw === 'mock') {
    return new MockImageGenerationProvider();
  }

  if (raw !== 'openai') {
    throw new Error(
      `Unknown IMAGE_GENERATION_PROVIDER_TOKEN "${raw}" (expected "mock" or "openai")`,
    );
  }

  const apiKey = env['OPENAI_API_KEY'];
  if (!apiKey) {
    throw new Error('IMAGE_GENERATION_PROVIDER_TOKEN=openai requires OPENAI_API_KEY to be set');
  }

  return new OpenAIImageGenerationProvider({
    apiKey,
    ...(env['OPENAI_IMAGE_MODEL'] && { model: env['OPENAI_IMAGE_MODEL'] }),
  });
}
