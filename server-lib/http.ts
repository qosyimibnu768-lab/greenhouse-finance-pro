/** Helper respons JSON untuk Vercel Serverless Functions. */

export function jsonResponse(body: any, status = 200, extraHeaders?: Record<string, string>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      ...(extraHeaders || {}),
    },
  });
}

export async function readJsonBody(request: Request): Promise<{ ok: boolean; data?: any; error?: string }> {
  try {
    const data = await request.json();
    return { ok: true, data };
  } catch {
    return { ok: false, error: 'Body request bukan JSON yang valid.' };
  }
}
