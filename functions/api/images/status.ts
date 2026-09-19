interface Env {
  ZOSUF_IMAGES?: {
    put: (key: string, value: any, options?: any) => Promise<any>;
    get: (key: string) => Promise<any>;
  };
  PUBLIC_R2_DOMAIN?: string;
}

export const onRequestGet = async (context: { request: Request; env: Env }) => {
  const isConfigured = Boolean(context.env?.ZOSUF_IMAGES);

  return new Response(
    JSON.stringify({
      available: isConfigured,
      r2Configured: isConfigured,
      maxSizeBytes: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/jpeg', 'image/png', 'image/webp'],
      message: isConfigured
        ? 'Cloudflare R2 image storage is active and ready.'
        : 'Cloud upload is not configured. You can still use Public Image URL or Direct Small-Image QR.',
    }),
    {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
    }
  );
};
