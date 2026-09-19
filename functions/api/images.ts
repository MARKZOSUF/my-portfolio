interface Env {
  ZOSUF_IMAGES?: {
    put: (key: string, value: any, options?: any) => Promise<any>;
    get: (key: string) => Promise<any>;
  };
  PUBLIC_R2_DOMAIN?: string;
}

const ALLOWED_MIME: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const onRequestPost = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;

    if (!env?.ZOSUF_IMAGES) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Cloud upload is not configured. You can still use Public Image URL or Direct Small-Image QR.',
        }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return new Response(
        JSON.stringify({ success: false, error: 'Expected multipart/form-data payload' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const formData = await request.formData();
    const file = formData.get('image');

    if (!file || !(file instanceof File)) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing image file in request' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // 10 MB limit
    if (file.size > 10 * 1024 * 1024) {
      return new Response(
        JSON.stringify({ success: false, error: 'File exceeds maximum 10 MB limit' }),
        { status: 413, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const mime = file.type.toLowerCase();
    const ext = ALLOWED_MIME[mime];
    if (!ext) {
      return new Response(
        JSON.stringify({ success: false, error: 'Only JPG, PNG and WebP images are allowed' }),
        { status: 415, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Read buffer & check basic signatures
    const buffer = await file.arrayBuffer();
    const bytes = new Uint8Array(buffer.slice(0, 12));

    let validSignature = false;
    // JPEG: FF D8 FF
    if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
      validSignature = true;
    }
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    else if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
      validSignature = true;
    }
    // WebP: RIFF ... WEBP
    else if (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    ) {
      validSignature = true;
    }

    if (!validSignature) {
      return new Response(
        JSON.stringify({ success: false, error: 'File binary header does not match valid image format' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Cryptographically random object key
    const uniqueId = crypto.randomUUID().replace(/-/g, '');
    const objectKey = `zosuf_${Date.now()}_${uniqueId}.${ext}`;

    await env.ZOSUF_IMAGES.put(objectKey, buffer, {
      httpMetadata: {
        contentType: mime,
        cacheControl: 'public, max-age=31536000, immutable',
      },
    });

    // Derive public URL: use configured PUBLIC_R2_DOMAIN or the built-in image proxy
    const host = new URL(request.url).origin;
    const configuredDomain = env.PUBLIC_R2_DOMAIN?.trim().replace(/\/+$/, '');
    const publicBase = configuredDomain
      ? (/^https?:\/\//i.test(configuredDomain) ? configuredDomain : `https://${configuredDomain}`)
      : '';
    const publicUrl = publicBase
      ? `${publicBase}/${encodeURIComponent(objectKey)}`
      : `${host}/api/images?key=${encodeURIComponent(objectKey)}`;

    return new Response(
      JSON.stringify({
        success: true,
        key: objectKey,
        url: publicUrl,
        size: file.size,
        contentType: mime,
      }),
      {
        status: 201,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-store',
        },
      }
    );
  } catch {
    return new Response(
      JSON.stringify({ success: false, error: 'Internal storage error during upload' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  try {
    const { request, env } = context;
    const url = new URL(request.url);
    const key = url.searchParams.get('key');

    if (!key || !env?.ZOSUF_IMAGES) {
      return new Response('Not found', { status: 404 });
    }

    // Basic sanitize
    const sanitizedKey = key.replace(/[^a-zA-Z0-9_.-]/g, '');
    if (sanitizedKey !== key || !/^zosuf_[0-9]+_[a-f0-9]+\.(jpg|png|webp)$/.test(sanitizedKey)) {
      return new Response('Invalid image key', { status: 400 });
    }
    const object = await env.ZOSUF_IMAGES.get(sanitizedKey);

    if (!object) {
      return new Response('Image not found', { status: 404 });
    }

    const headers = new Headers();
    object.writeHttpMetadata(headers);
    headers.set('etag', object.httpEtag);
    headers.set('Cache-Control', 'public, max-age=31536000, immutable');
    headers.set('X-Content-Type-Options', 'nosniff');

    return new Response(object.body, { headers });
  } catch {
    return new Response('Error retrieving image', { status: 500 });
  }
};
