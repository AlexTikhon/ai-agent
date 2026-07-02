import { describe, it, expect, vi } from 'vitest';
import {
  OpenAIImageGenerationProvider,
  ImageGenerationProviderError,
  buildImagePrompt,
} from './openai-image-generation-provider';
import type { ImageGenerationInput } from './image-generation-provider';
import { Pronouns, type CharacterCard, type GeneratedImageEntry } from '@book/types';

function makeCharacterCard(overrides: Partial<CharacterCard> = {}): CharacterCard {
  return {
    name: 'Mia',
    age: 5,
    pronouns: Pronouns.SheHer,
    appearance: {
      hairColor: 'brown',
      hairStyle: 'wavy',
      eyeColor: 'brown',
      skinTone: 'medium',
      distinctiveFeatures: ['bright smile'],
    },
    personality: {
      traits: ['curious'],
      favoriteAnimals: ['rabbit'],
      favoriteColors: ['purple'],
      favoriteToys: ['blocks'],
      hobbies: ['drawing'],
    },
    visualAnchor: 'A 5-year-old child named Mia with wavy brown hair',
    narrativeDescription: 'Mia is curious and brave.',
    ...overrides,
  };
}

function makeEntry(overrides: Partial<GeneratedImageEntry> = {}): GeneratedImageEntry {
  return {
    id: 'b-1-cover',
    kind: 'cover',
    prompt: 'Mia standing in a sunny garden',
    provider: 'local_mock',
    status: 'complete',
    imageUrl: '/mock-images/b-1/cover.svg',
    altText: 'Cover illustration',
    width: 768,
    height: 1024,
    seed: 'b-1:cover:0',
    ...overrides,
  };
}

function makeInput(overrides: Partial<ImageGenerationInput> = {}): ImageGenerationInput {
  return {
    bookId: 'b-1',
    entry: makeEntry(),
    characterCard: makeCharacterCard(),
    ...overrides,
  };
}

const TINY_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

function makeFetchOk(b64Json = TINY_PNG_BASE64) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({ data: [{ b64_json: b64Json }] }),
    text: async () => '',
  });
}

describe('buildImagePrompt', () => {
  it('includes visualAnchor, narrativeDescription, and the scene prompt', () => {
    const prompt = buildImagePrompt(
      { visualAnchor: 'A brave child named Leo', narrativeDescription: 'Leo loves space.' },
      { prompt: 'Leo exploring a spaceship' },
    );

    expect(prompt).toContain('A brave child named Leo');
    expect(prompt).toContain('Leo loves space.');
    expect(prompt).toContain('Leo exploring a spaceship');
  });

  it('instructs no text, captions, or watermarks', () => {
    const prompt = buildImagePrompt(
      { visualAnchor: 'anchor', narrativeDescription: 'desc' },
      { prompt: 'scene' },
    );

    expect(prompt).toMatch(/no text/i);
    expect(prompt).toMatch(/watermark/i);
  });
});

describe('OpenAIImageGenerationProvider', () => {
  it('throws when constructed without an apiKey', () => {
    expect(() => new OpenAIImageGenerationProvider({ apiKey: '' })).toThrow(
      ImageGenerationProviderError,
    );
  });

  it('sends the expected request shape via the injectable fetchImpl', async () => {
    const fetchImpl = makeFetchOk();
    const provider = new OpenAIImageGenerationProvider({
      apiKey: 'sk-test',
      model: 'gpt-image-test',
      baseUrl: 'https://example.test/v1',
      fetchImpl,
    });

    await provider.generateImage(makeInput());

    expect(fetchImpl).toHaveBeenCalledWith(
      'https://example.test/v1/images/generations',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ Authorization: 'Bearer sk-test' }),
      }),
    );
    const body = JSON.parse(fetchImpl.mock.calls[0]![1].body as string);
    expect(body.model).toBe('gpt-image-test');
    expect(body.n).toBe(1);
    expect(typeof body.prompt).toBe('string');
    expect(body.prompt).toContain('Mia');
  });

  it('maps a successful response to the ImageGenerationOutput shape', async () => {
    const fetchImpl = makeFetchOk();
    const provider = new OpenAIImageGenerationProvider({ apiKey: 'sk-test', fetchImpl });

    const result = await provider.generateImage(makeInput());

    expect(Buffer.isBuffer(result.buffer)).toBe(true);
    expect(result.buffer.length).toBeGreaterThan(0);
    expect(result.contentType).toBe('image/png');
    expect(result.buffer.equals(Buffer.from(TINY_PNG_BASE64, 'base64'))).toBe(true);
  });

  it('throws a clear error when the HTTP response is not ok', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({}),
      text: async () => 'invalid api key',
    });
    const provider = new OpenAIImageGenerationProvider({ apiKey: 'sk-bad', fetchImpl });

    await expect(provider.generateImage(makeInput())).rejects.toThrow(/status 401/);
  });

  it('throws a clear error when fetch itself rejects', async () => {
    const fetchImpl = vi.fn().mockRejectedValue(new Error('network down'));
    const provider = new OpenAIImageGenerationProvider({ apiKey: 'sk-test', fetchImpl });

    await expect(provider.generateImage(makeInput())).rejects.toThrow(/network down/);
  });

  it('throws a clear error when the response is missing b64_json data', async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ data: [{}] }),
      text: async () => '',
    });
    const provider = new OpenAIImageGenerationProvider({ apiKey: 'sk-test', fetchImpl });

    await expect(provider.generateImage(makeInput())).rejects.toThrow(/b64_json/);
  });
});
