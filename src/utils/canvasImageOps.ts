import { ProcessedImageResult } from '../types/image';

/**
 * Loads an image File into an HTMLImageElement
 */
export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Failed to decode image data'));
      img.src = e.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read file from disk'));
    reader.readAsDataURL(file);
  });
}

export interface ImageProcessingOptions {
  maxWidth?: number;
  maxHeight?: number;
  targetWidth?: number;
  targetHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/jpeg' | 'image/png' | 'image/webp';
  rotateDegrees?: number; // 0, 90, 180, 270
  flipHorizontal?: boolean;
  flipVertical?: boolean;
  backgroundColor?: string; // For JPG conversion or transparent fills
  crop?: { x: number; y: number; width: number; height: number };
}

/**
 * Strips metadata and processes an image locally in canvas
 */
export async function processImage(
  source: HTMLImageElement | File,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImageResult> {
  let img: HTMLImageElement;
  let originalSizeBytes = 0;

  if (source instanceof File) {
    originalSizeBytes = source.size;
    img = await loadImageFromFile(source);
  } else {
    img = source;
    originalSizeBytes = img.src.length;
  }

  const {
    maxWidth = 2048,
    maxHeight = 2048,
    quality = 0.85,
    format = 'image/jpeg',
    rotateDegrees = 0,
    flipHorizontal = false,
    flipVertical = false,
    backgroundColor = '#ffffff',
    crop,
  } = options;

  let sourceX = 0;
  let sourceY = 0;
  let sourceWidth = img.naturalWidth || img.width;
  let sourceHeight = img.naturalHeight || img.height;

  if (crop) {
    sourceX = Math.max(0, crop.x);
    sourceY = Math.max(0, crop.y);
    sourceWidth = Math.min(sourceWidth - sourceX, crop.width);
    sourceHeight = Math.min(sourceHeight - sourceY, crop.height);
  }

  // Calculate scaled dimensions
  let destWidth = sourceWidth;
  let destHeight = sourceHeight;

  if (options.targetWidth && options.targetHeight) {
    destWidth = options.targetWidth;
    destHeight = options.targetHeight;
  } else {
    const scale = Math.min(1, maxWidth / destWidth, maxHeight / destHeight);
    destWidth = Math.round(destWidth * scale);
    destHeight = Math.round(destHeight * scale);
  }

  const canvas = document.createElement('canvas');
  const isRotated90or270 = Math.abs(rotateDegrees % 180) === 90;

  canvas.width = isRotated90or270 ? destHeight : destWidth;
  canvas.height = isRotated90or270 ? destWidth : destHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not obtain canvas 2D rendering context');

  // Fill background if format is JPEG or explicit color provided
  if (format === 'image/jpeg' || backgroundColor !== 'transparent') {
    ctx.fillStyle = backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // Transformations
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);

  if (rotateDegrees !== 0) {
    ctx.rotate((rotateDegrees * Math.PI) / 180);
  }

  const scaleX = flipHorizontal ? -1 : 1;
  const scaleY = flipVertical ? -1 : 1;
  ctx.scale(scaleX, scaleY);

  ctx.drawImage(
    img,
    sourceX,
    sourceY,
    sourceWidth,
    sourceHeight,
    -destWidth / 2,
    -destHeight / 2,
    destWidth,
    destHeight
  );

  ctx.restore();

  // Export to clean blob & dataURL (strips all EXIF / metadata)
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Canvas export failed'));
        const dataUrl = canvas.toDataURL(format, quality);
        resolve({
          dataUrl,
          blob,
          width: canvas.width,
          height: canvas.height,
          sizeBytes: blob.size,
          originalSizeBytes,
          format,
        });
      },
      format,
      quality
    );
  });
}

/**
 * QR Code theoretical maximum capacity in bytes (binary 8-bit mode)
 * Version 40 (177x177 modules):
 * L: ~2953 bytes
 * M: ~2331 bytes
 * Q: ~1663 bytes
 * H: ~1273 bytes
 */
export const QR_BYTE_CAPACITY: Record<'L' | 'M' | 'Q' | 'H', number> = {
  L: 2953,
  M: 2331,
  Q: 1663,
  H: 1273,
};
