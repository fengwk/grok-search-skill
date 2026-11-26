import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import { search } from '../grok-search.mjs';

const env = { GROK_SEARCH_BASE_URL: 'https://proxy.example.test/v1/', GROK_SEARCH_API_KEY: 'test-secret' };
const query = 'Find recent Pi release notes.\nInclude official links.';
const url = 'https://example.test/releases';
const x = 'https://x.com/example/status/1';
const answer = `Found the release notes.[[1]](${url})`;
const message = { type: 'message', role: 'assistant', content: [{
  type: 'output_text', text: answer,
  annotations: [{ type: 'url_citation', url, title: '1' }, { type: 'url_citation', url: x, title: x }],
}] };
const response = {
  status: 'completed', output: [message, { type: 'web_search_call', status: 'completed', action: {
    sources: [{ url, title: 'Release notes' }],
  } }],
  usage: {
    input_tokens: 3804, output_tokens: 889, total_tokens: 4693,
    input_tokens_details: { cached_tokens: 3072 }, output_tokens_details: { reasoning_tokens: 828 },
    context_details: { input_tokens: 600, output_tokens: 38 },
    server_side_tool_usage_details: { web_search_calls: 6, x_search_calls: 1, x_posts_fetched: 2, x_users_fetched: 0 },
  },
};

test('sends both server tools but keeps the default result and source fields compact', async () => {
  const earliest = Math.floor(Date.now() / 1000) * 1000;
  const result = await search(query, env, async (target, init) => {
    assert.equal(target.href, 'https://proxy.example.test/v1/responses');
    assert.equal(init.headers.authorization, 'Bearer test-secret');
    assert.equal(init.redirect, 'error');
    const payload = JSON.parse(init.body);
    assert.equal(payload.model, 'grok-4.7');
    assert.deepEqual(payload.input.map(({ role }) => role), ['system', 'user']);
    assert.match(payload.input[0].content, /\[date\].*time-sensitive questions/);
    assert.match(payload.input[0].content, /summarize what the source says and link to it/);
    assert.match(payload.input[0].content, /publication or event dates when timing matters/);
    // Preserve the full query verbatim and timestamp the request at submission.
    const prefix = `[user query]\n${query}\n\n[date]\n`;
    const input = payload.input[1].content;
    assert.ok(input.startsWith(prefix));
    const timestamp = input.slice(prefix.length).split(' ')[0];
    const date = Date.parse(timestamp);
    assert.ok(date >= earliest && date <= Date.now());
    assert.ok(!payload.input[0].content.includes(timestamp));
    assert.deepEqual(payload.tools, [{ type: 'web_search' }, { type: 'x_search' }]);
    assert.equal(payload.stream, false);
    assert.equal(payload.store, false);
    assert.equal(payload.max_turns, 3);
    return Response.json(response);
  });
  assert.deepEqual(result, {
    schema_version: 2, status: 'ok', answer, sources: [{ url, title: 'Release notes' }, { url: x }],
  });
});

test('the CLI sends an explicit --max-turns and shows it with usage in --verbose', () => {
  // Replace fetch before loading the actual CLI to check the request without calling CPA.
  const preload = `data:text/javascript,${encodeURIComponent(`
    globalThis.fetch = async (_, { body }) => {
      const payload = JSON.parse(body);
      if (payload.max_turns !== 2) throw new Error('Wrong max_turns');
      if (!payload.input[1].content.endsWith('+08:00 (Asia/Shanghai)')) throw new Error('Missing local time zone');
      return Response.json(${JSON.stringify(response)});
    };
  `)}`;
  const cli = fileURLToPath(new URL('../grok-search.mjs', import.meta.url));
  const run = spawnSync(process.execPath, ['--import', preload, cli, '--query', query, '--max-turns', '2', '--verbose'], {
    encoding: 'utf8', env: { ...env, TZ: 'Asia/Shanghai' }, timeout: 5000,
  });
  assert.equal(run.status, 0, run.stderr || run.stdout);
  const result = JSON.parse(run.stdout);
  assert.equal(result.status, 'ok');
  assert.deepEqual(result.usage, {
    input_tokens: 3804, output_tokens: 889, total_tokens: 4693,
    cache_read_tokens: 3072, reasoning_tokens: 828,
  });
  assert.deepEqual(result.loop, { max_turns: 2 });
  assert.deepEqual(result.search, {
    web_search: { executed: true, calls: 6 },
    x_search: { executed: true, calls: 1, posts_fetched: 2, users_fetched: 0 },
  });
});

test('does not let CPA placeholder zeros override legacy cache and reasoning counts', async () => {
  const result = await search(query, env, async () => Response.json({ ...response, usage: {
    prompt_tokens: 10, completion_tokens: 8,
    input_tokens_details: { cached_tokens: 0 }, output_tokens_details: { reasoning_tokens: 0 },
    prompt_tokens_details: { cached_tokens: 5, cache_write_tokens: 0 },
    completion_tokens_details: { reasoning_tokens: 4 },
  } }), { verbose: true });
  assert.deepEqual(result.usage, {
    input_tokens: 10, output_tokens: 8,
    cache_read_tokens: 5, cache_write_tokens: 0, reasoning_tokens: 4,
  });
});

test('does not infer execution from a citation when the proxy omits usage and call records', async () => {
  const result = await search(query, env, async () => Response.json({ status: 'completed', output: [message] }), { verbose: true });
  assert.equal(result.status, 'unverified');
  assert.equal(result.search, undefined);
});

test('preserves an incomplete answer and distinguishes explicit zero from missing counts', async () => {
  const result = await search(query, env, async () => Response.json({
    status: 'incomplete', output: [message], usage: { server_side_tool_usage_details: { x_search_calls: 0 } },
  }), { verbose: true });
  assert.equal(result.status, 'partial');
  assert.equal(result.answer, answer);
  assert.deepEqual(result.sources, [{ url }, { url: x }]);
  assert.equal(result.usage, undefined);
  assert.deepEqual(result.search, { x_search: { executed: false, calls: 0 } });
});

test('rejects missing configuration or an insecure base URL before sending credentials', async () => {
  const request = () => assert.fail('no request should be sent');
  const missing = await search(query, {}, request);
  assert.equal(missing.error.code, 'config_missing');
  assert.match(missing.error.message, /GROK_SEARCH_BASE_URL.*GROK_SEARCH_API_KEY/);
  // A shared CPA credential must never be used as a fallback.
  const sharedKeyOnly = await search(query, { GROK_SEARCH_BASE_URL: env.GROK_SEARCH_BASE_URL, CPA_API_KEY: 'shared-test-key' }, request);
  assert.equal(sharedKeyOnly.error.code, 'config_missing');
  assert.match(sharedKeyOnly.error.message, /Missing environment variables: GROK_SEARCH_API_KEY\./);
  const insecure = await search(query, { ...env, GROK_SEARCH_BASE_URL: 'http://proxy.example.test/v1' }, request);
  assert.equal(insecure.error.code, 'invalid_base_url');
});

test('rejects invalid search turn limits before calling CPA', async () => {
  // Reject invalid values before they can trigger a billable request.
  const request = () => assert.fail('no request should be sent');
  for (const maxTurns of ['0', '-1', '1.5', '1e2', '9007199254740992']) {
    const result = await search(query, env, request, { maxTurns });
    assert.equal(result.error.code, 'invalid_max_turns', maxTurns);
  }
});

test('does not retry or echo remote failure bodies', async () => {
  let calls = 0;
  const result = await search(query, env, async () => {
    calls++;
    return new Response('internal error containing test-secret', { status: 502 });
  });
  assert.equal(calls, 1);
  assert.equal(result.error.code, 'http_error');
  assert.doesNotMatch(JSON.stringify(result), /test-secret/);
});
