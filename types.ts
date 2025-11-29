export interface TranscriptionResponse {
  text: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  RECORDING = 'RECORDING',
  PROCESSING = 'PROCESSING',
  REWRITING = 'REWRITING',
  COMPLETED = 'COMPLETED',
  ERROR = 'ERROR'
}

export interface ApiSettings {
  token: string;
}

export type RewriteStyle = 'Professional' | 'Casual' | 'Concise' | 'Email' | 'Polished';

export const STYLE_LABELS: Record<RewriteStyle, { label: string; icon: string }> = {
  'Polished': { label: 'Polished', icon: 'auto_fix_high' },
  'Professional': { label: 'Professional', icon: 'business_center' },
  'Casual': { label: 'Casual', icon: 'coffee' },
  'Concise': { label: 'Concise', icon: 'short_text' },
  'Email': { label: 'Email', icon: 'mail' },
};

export type TargetLanguage = 'Original' | 'Chinese' | 'English';

export const LANGUAGE_LABELS: Record<TargetLanguage, string> = {
  'Original': 'Original',
  'Chinese': 'Chinese',
  'English': 'English',
};