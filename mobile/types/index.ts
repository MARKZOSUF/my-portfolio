export type UUID = string;
export type GenerationMode = 'quick_notes' | 'detailed_notes' | 'deep_research' | 'exam_mode' | 'study_everything';
export type TaskState = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled';
export interface User { id: UUID; email: string; displayName: string; }
export interface Note { id: UUID; title: string; content: string; subject?: string; topic?: string; createdAt: string; updatedAt: string; cached?: boolean; }
export interface StudySection { key: string; title: string; applicable: boolean; markdown: string; confidence?: number; citations?: Array<{label:string; url:string}>; }
export interface StudyPackage { id: UUID; topic: string; mode: GenerationMode; sections: StudySection[]; warnings: string[]; createdAt: string; }
export interface QuizQuestion { id: UUID; type: 'mcq'|'true_false'|'fill_blank'|'short_answer'|'numerical'|'conceptual'|'viva'; prompt: string; options?: string[]; answer: string; explanation: string; difficulty: 'easy'|'medium'|'hard'; topic: string; }
export interface Flashcard { id: UUID; front: string; back: string; dueAt: string; intervalDays: number; ease: number; bookmarked: boolean; }
export interface ApiErrorShape { code: string; message: string; requestId?: string; details?: unknown; }
