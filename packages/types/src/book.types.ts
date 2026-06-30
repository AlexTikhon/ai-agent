import type { BookGenre, BookLength, IllustrationStyle, Pronouns } from './agent.types';

// ─── Character ───────────────────────────────────────────────────────────────

export interface CharacterAppearance {
  hairColor: string;
  hairStyle: string;
  eyeColor: string;
  skinTone: string;
  distinctiveFeatures: string[];
}

export interface CharacterPersonality {
  traits: string[];
  favoriteAnimals: string[];
  favoriteColors: string[];
  favoriteToys: string[];
  hobbies: string[];
}

/**
 * The primary output of the CharacterBuilderAgent.
 * `visualAnchor` is the canonical single-sentence description prepended to every image prompt.
 */
export interface CharacterCard {
  name: string;
  nickname?: string;
  age: number;
  pronouns: Pronouns;
  appearance: CharacterAppearance;
  personality: CharacterPersonality;
  /** Canonical image-prompt fragment; prepended to every illustration prompt. */
  visualAnchor: string;
  /** Full prose description for LLM story context. */
  narrativeDescription: string;
}

// ─── Story ───────────────────────────────────────────────────────────────────

export interface ChapterOutline {
  chapterNumber: number;
  title: string;
  summary: string;
  setting: string;
  emotionalArc: string;
  keyEvents: string[];
  /** One illustrable scene per page in this chapter. */
  illustrableScenes: string[];
}

export interface StoryPlan {
  title: string;
  subtitle?: string;
  theme: string;
  educationalMessage: string;
  chapters: ChapterOutline[];
  openingHook: string;
  resolution: string;
  dedicationSuggestion?: string;
}

// ─── Book content (per page) ─────────────────────────────────────────────────

export interface ImagePrompt {
  positivePrompt: string;
  negativePrompt: string;
  style: IllustrationStyle;
  aspectRatio: '4:3' | '3:4' | '1:1' | '16:9';
  mood: string;
  colorPalette: string[];
  pageNumber: number;
}

export interface Page {
  pageNumber: number;
  textContent: string;
  readingLevel: number;
  wordCount: number;
  illustrationNote: string;
  imagePrompt?: ImagePrompt;
}

export interface Chapter {
  chapterNumber: number;
  title: string;
  pages: Page[];
  /** Brief summary used as context for the next chapter. */
  summary: string;
}

// ─── QA / Layout ─────────────────────────────────────────────────────────────

export interface QualityScore {
  pageNumber: number;
  consistency: number;
  alignment: number;
  safety: number;
  ageAppropriateness: number;
  action: 'pass' | 'regen_image' | 'regen_text' | 'flag';
  notes?: string;
}

export interface QualityReport {
  scores: QualityScore[];
  overallPassed: boolean;
  flaggedPages: number[];
}

export interface PageRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FontSpec {
  family: string;
  size: number;
  weight: 400 | 500 | 600 | 700 | 800;
  lineHeight: number;
  letterSpacing: number;
  direction?: 'ltr' | 'rtl';
}

export interface PageLayout {
  pageNumber: number;
  template: 'COVER' | 'CHAPTER_START' | 'BODY_TEXT_LEFT' | 'BODY_FULL_IMAGE' | 'ENDING';
  imageRegion: PageRegion;
  textBlocks: Array<{
    content: string;
    region: PageRegion;
    font: FontSpec;
    alignment: 'left' | 'center' | 'right';
  }>;
  backgroundColor: string;
  backgroundGradient?: string;
}

// ─── Generated image result ───────────────────────────────────────────────────

export interface GeneratedImage {
  r2Key: string;
  url: string;
  seed: number;
  model: string;
  timingMs: number;
  pageNumber: number;
}

// ─── Book request (wizard output / API input) ─────────────────────────────────

export interface ChildProfile {
  name: string;
  nickname?: string;
  age: number;
  pronouns: Pronouns;
  appearance: CharacterAppearance;
  personality: CharacterPersonality;
  birthday?: string;
  photoAssetId?: string;
}

export interface BookRequest {
  childProfile: ChildProfile;
  genre: BookGenre;
  illustrationStyle: IllustrationStyle;
  colorPalette: string[];
  educationalGoal: string;
  bookLength: BookLength;
  language: string;
  dedicationText?: string;
  childProfileId?: string;
  characterCardId?: string;
  seriesId?: string;
}

// ─── AI model version tracking ────────────────────────────────────────────────

export interface AiModelVersions {
  story: string;
  image: string;
  qa?: string;
}
