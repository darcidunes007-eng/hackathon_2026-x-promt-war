import test from 'node:test';
import assert from 'node:assert/strict';
import { parseJsonResponse } from './apiClient.ts';

test('parseJsonResponse parses valid 200 JSON responses', async () => {
  const res = new Response(JSON.stringify({ ok: true, reply: 'Hello scholar' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

  const data = await parseJsonResponse<{ ok: boolean; reply: string }>(res);
  assert.equal(data.ok, true);
  assert.equal(data.reply, 'Hello scholar');
});

test('parseJsonResponse turns HTML responses into clear HTTP-coded errors instead of crashing on Unexpected token <', async () => {
  const html = '<!doctype html><html><head><title>404</title></head><body>Not found</body></html>';
  const res = new Response(html, {
    status: 404,
    statusText: 'Not Found',
    headers: { 'Content-Type': 'text/html' },
  });

  await assert.rejects(
    () => parseJsonResponse(res),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /HTML page instead of JSON/i);
      assert.match(err.message, /HTTP 404/);
      assert.equal(err.message.includes('Unexpected token'), false);
      return true;
    }
  );
});

test('parseJsonResponse includes backend error message and HTTP status on JSON error responses', async () => {
  const res = new Response(JSON.stringify({ error: 'Message must be between 2 and 2500 characters.' }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' },
  });

  await assert.rejects(
    () => parseJsonResponse(res),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /Message must be between 2 and 2500 characters/);
      assert.match(err.message, /HTTP 400/);
      return true;
    }
  );
});

test('parseJsonResponse handles empty error bodies gracefully with status code', async () => {
  const res = new Response('', {
    status: 502,
    statusText: 'Bad Gateway',
  });

  await assert.rejects(
    () => parseJsonResponse(res, 'Upstream unavailable'),
    (err: unknown) => {
      assert(err instanceof Error);
      assert.match(err.message, /Upstream unavailable \(HTTP 502\)/);
      return true;
    }
  );
});
