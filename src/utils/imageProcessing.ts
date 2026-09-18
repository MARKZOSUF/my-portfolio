export interface ProcessedImageResult {
  dataUrl: string;
  blob: Blob;
  width: number;
  height: number;
  fileSizeBytes: number;
  mimeType: string;
  filename: string;
}

export interface ImageProcessingOptions {
  targetWidth?: number;
  targetHeight?: number;
  quality?: number; // 0.1 to 1.0
  format?: 'image/png' | 'image/jpeg' | 'image/webp';
  cropRect?: { x: number; y: number; width: number; height: number };
}

/**
 * Validate image file format and size
 */
export function validateImageFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || 'unknown'}). Please upload a JPG, PNG, or WebP image.`,
    };
  }

  const maxBytes = 25 * 1024 * 1024; // 25 MB
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 25 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Strict validator for Image-to-QR uploads (Max 10MB, non-empty, JPG/PNG/WebP only)
 */
export function validateImageToQRFile(file: File | null | undefined): { valid: boolean; error?: string } {
  if (!file) {
    return {
      valid: false,
      error: 'Please select an image file to upload.',
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: 'The uploaded file is empty (0 bytes). Please choose a valid image.',
    };
  }

  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowedTypes.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: `Unsupported file format (${file.type || 'unknown'}). Please upload a JPG, PNG, or WebP image.`,
    };
  }

  const maxBytes = 10 * 1024 * 1024; // 10 MB maximum per user requirement
  if (file.size > maxBytes) {
    return {
      valid: false,
      error: `File is too large (${(file.size / (1024 * 1024)).toFixed(1)} MB). Maximum allowed size is 10 MB.`,
    };
  }

  return { valid: true };
}

/**
 * Loads an image File or Data URL into an HTMLImageElement
 */
export function loadImageElement(source: File | string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load image into browser memory.'));

    if (typeof source === 'string') {
      img.src = source;
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error('Failed reading file.'));
      reader.readAsDataURL(source);
    }
  });
}

/**
 * Core browser image processor: resize, convert format, compress quality, and crop.
 * EXIF metadata is naturally removed by drawing the raw pixel buffer to a new HTML Canvas.
 */
export async function processBrowserImage(
  source: File | string,
  options: ImageProcessingOptions = {}
): Promise<ProcessedImageResult> {
  const img = await loadImageElement(source);

  const origWidth = img.naturalWidth || img.width;
  const origHeight = img.naturalHeight || img.height;

  // Source clipping rectangle (crop if specified)
  const sx = options.cropRect ? options.cropRect.x : 0;
  const sy = options.cropRect ? options.cropRect.y : 0;
  const sw = options.cropRect ? options.cropRect.width : origWidth;
  const sh = options.cropRect ? options.cropRect.height : origHeight;

  // Target output dimensions
  const destWidth = options.targetWidth || sw;
  const destHeight = options.targetHeight || sh;

  const canvas = document.createElement('canvas');
  canvas.width = destWidth;
  canvas.height = destHeight;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Could not obtain canvas 2D rendering context.');
  }

  // Smooth resampling
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // Format selection
  const mimeType = options.format || 'image/png';
  const quality = options.quality !== undefined ? options.quality : 0.92;

  // If converting to JPEG, draw white backing because JPEG does not support transparency
  if (mimeType === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, destWidth, destHeight);
  }

  // Draw image pixels (removes EXIF metadata)
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, destWidth, destHeight);

  // Convert to Blob & DataURL
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error('Failed to generate image blob from canvas.'));
          return;
        }
        const dataUrl = canvas.toDataURL(mimeType, quality);
        const ext = mimeType === 'image/jpeg' ? 'jpg' : mimeType === 'image/webp' ? 'webp' : 'png';
        const filename = `zosuf-processed-${Date.now()}.${ext}`;

        resolve({
          dataUrl,
          blob,
          width: destWidth,
          height: destHeight,
          fileSizeBytes: blob.size,
          mimeType,
          filename,
        });
      },
      mimeType,
      quality
    );
  });
}

/**
 * Dedicated in-browser compressor for Image-to-QR generation.
 * Resizes the image into ultra-compact pixel dimensions and converts it to a data URL.
 */
export async function compressImageForQR(
  source: File | string,
  options: {
    maxDimension?: number;
    quality?: number;
    format?: 'image/webp' | 'image/jpeg' | 'image/png';
  } = {}
): Promise<{
  dataUrl: string;
  width: number;
  height: number;
  lengthChars: number;
  fileSizeBytes: number;
}> {
  const img = await loadImageElement(source);
  const origW = img.naturalWidth || img.width;
  const origH = img.naturalHeight || img.height;

  const maxDim = options.maxDimension || 32;
  let targetW = origW;
  let targetH = origH;

  if (origW > maxDim || origH > maxDim) {
    if (origW >= origH) {
      targetW = maxDim;
      targetH = Math.max(1, Math.round((origH / origW) * maxDim));
    } else {
      targetH = maxDim;
      targetW = Math.max(1, Math.round((origW / origH) * maxDim));
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  const format = options.format || 'image/webp';
  const quality = options.quality !== undefined ? options.quality : 0.6;

  if (format === 'image/jpeg') {
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, targetW, targetH);
  }

  ctx.drawImage(img, 0, 0, targetW, targetH);
  const dataUrl = canvas.toDataURL(format, quality);

  // Approximate byte size of base64 data URL
  const base64Part = dataUrl.split(',')[1] || '';
  const byteCount = Math.round((base64Part.length * 3) / 4);

  return {
    dataUrl,
    width: targetW,
    height: targetH,
    lengthChars: dataUrl.length,
    fileSizeBytes: byteCount,
  };
}

/**
 * Format bytes into human readable string
 */
export function formatBytes(bytes: number, decimals: number = 2): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

/**
 * Triggers client-side download of a blob or dataUrl
 */
export function downloadFile(contentUrl: string, filename: string): boolean {
  try {
    const a = document.createElement('a');
    a.href = contentUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    return true;
  } catch (err) {
    console.error('Download error:', err);
    return false;
  }
}
