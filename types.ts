
export interface GenerationResult {
  originalImage: string | null;
  generatedImage: string | null;
  prompt: string;
}

export interface DesignIteration {
  id: string;
  prompt: string;
  image: string;
  timestamp: number;
}

export interface SavedDesign {
  id: string;
  userId?: string; // New field to link design to a user
  timestamp: number;
  originalImage: string;
  generatedImage: string; // Represents the latest/thumbnail image
  prompt: string; // Represents the latest prompt
  iterations?: DesignIteration[]; // Full history of changes
}

export interface AutoSaveState {
  timestamp: number;
  prompt: string;
  imagePreview: string | null;
  generatedImage: string | null;
  pastIterations: DesignIteration[];
  originalImageRef: string | null;
  appState: AppState;
}

export enum AppState {
  IDLE = 'IDLE',
  LOADING = 'LOADING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface User {
  id: string;
  name: string;
  email: string;
}
