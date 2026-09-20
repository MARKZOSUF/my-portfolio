export interface ProcessedImageResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  sizeBytes: number;
  originalSizeBytes: number;
  format: 'image/jpeg' | 'image/png' | 'image/webp';
}

export type ImageToQRMode = 'url' | 'direct';
