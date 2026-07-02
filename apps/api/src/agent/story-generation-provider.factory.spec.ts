import { describe, it, expect } from 'vitest';
import { createStoryGenerationProvider } from './story-generation-provider.factory';
import { MockStoryGenerationProvider } from './story-generation-provider';
import { OpenAIStoryGenerationProvider } from './openai-story-generation-provider';

describe('createStoryGenerationProvider', () => {
  it('defaults to MockStoryGenerationProvider when STORY_GENERATION_PROVIDER is unset', () => {
    const provider = createStoryGenerationProvider({} as NodeJS.ProcessEnv);
    expect(provider).toBeInstanceOf(MockStoryGenerationProvider);
  });

  it('defaults to MockStoryGenerationProvider when STORY_GENERATION_PROVIDER is empty', () => {
    const provider = createStoryGenerationProvider({
      STORY_GENERATION_PROVIDER: '',
    } as unknown as NodeJS.ProcessEnv);
    expect(provider).toBeInstanceOf(MockStoryGenerationProvider);
  });

  it('returns MockStoryGenerationProvider when explicitly set to "mock"', () => {
    const provider = createStoryGenerationProvider({
      STORY_GENERATION_PROVIDER: 'mock',
    } as unknown as NodeJS.ProcessEnv);
    expect(provider).toBeInstanceOf(MockStoryGenerationProvider);
  });

  it('is case-insensitive for the provider name', () => {
    const provider = createStoryGenerationProvider({
      STORY_GENERATION_PROVIDER: 'MOCK',
    } as unknown as NodeJS.ProcessEnv);
    expect(provider).toBeInstanceOf(MockStoryGenerationProvider);
  });

  it('throws a clear error when selecting openai without OPENAI_API_KEY', () => {
    expect(() =>
      createStoryGenerationProvider({
        STORY_GENERATION_PROVIDER: 'openai',
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/OPENAI_API_KEY/);
  });

  it('returns OpenAIStoryGenerationProvider when selected with an API key', () => {
    const provider = createStoryGenerationProvider({
      STORY_GENERATION_PROVIDER: 'openai',
      OPENAI_API_KEY: 'sk-test-key',
    } as unknown as NodeJS.ProcessEnv);
    expect(provider).toBeInstanceOf(OpenAIStoryGenerationProvider);
  });

  it('throws a clear error for an unknown provider name', () => {
    expect(() =>
      createStoryGenerationProvider({
        STORY_GENERATION_PROVIDER: 'anthropic',
      } as unknown as NodeJS.ProcessEnv),
    ).toThrow(/Unknown STORY_GENERATION_PROVIDER/);
  });
});
