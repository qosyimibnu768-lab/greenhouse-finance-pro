/**
 * Vercel Serverless Function: /api/sync/events
 * Serverless tidak bisa menahan koneksi SSE dalam waktu lama, jadi endpoint ini
 * membalas stream singkat dan klien otomatis beralih ke polling /api/sync/version.
 */
export async function GET(): Promise<Response> {
  return new Response(': serverless-polling-only\n\n', {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
