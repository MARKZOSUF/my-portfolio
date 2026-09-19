export interface ProcessedImageResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  originalSizeBytes: number;
  format: 'image/jpeg' | 'image/png' | 'image/webp';
}

export type ImageToQRMode = 'url' | 'direct' | 'cloud';

export interface CloudUploadStatus {
  available: boolean;
  r2Configured: boolean;
  maxSizeBytes: number;
  allowedMimeTypes: string[];
  message: string;
}
