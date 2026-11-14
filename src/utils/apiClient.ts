export async function parseJsonResponse<T>(
  res: Response,
  fallbackError = 'Request failed'
): Promise<T> {
  const rawText = await res.text();
  let parsed: Record<string, unknown> = {};

  if (rawText.trim().length > 0) {
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      const looksLikeHtml = rawText.trim().toLowerCase().startsWith('<');
      const hint = looksLikeHtml
        ? 'The server returned an HTML page instead of JSON. Make sure the backend route exists and the API server/proxy is running.'
        : 'The server returned an invalid non-JSON response.';
      throw new Error(`${hint} (HTTP ${res.status}${res.statusText ? ` ${res.statusText}` : ''})`);
    }
  }

  if (!res.ok) {
    const serverMessage =
      typeof parsed.error === 'string' && parsed.error.trim().length > 0
        ? parsed.error.trim()
        : fallbackError;
    const hasStatus = serverMessage.includes(`HTTP ${res.status}`);
    throw new Error(hasStatus ? serverMessage : `${serverMessage} (HTTP ${res.status})`);
  }

  return parsed as T;
}

export async function postJson<TResponse>(
  url: string,
  payload: unknown,
  headers: Record<string, string> = {},
  fallbackError = 'Request failed'
): Promise<TResponse> {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(payload),
  });

  return parseJsonResponse<TResponse>(res, fallbackError);
}
