import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createApp } from '../src/app.js';

test('production hosting serves React deep links and keeps API errors as JSON', async () => {
  const dir = await mkdtemp(path.join(tmpdir(), 'dc-hosting-'));
  await writeFile(path.join(dir, 'index.html'), '<!doctype html><title>Developer Connect</title>');
  const app = createApp({ secret: 'test-only-secret-32-characters-long', staticPath: dir, trustProxy: 1 });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    for (const route of ['/', '/dashboard/edit', '/developers/ada-dev']) {
      const response = await fetch(base + route);
      assert.equal(response.status, 200);
      assert.match(await response.text(), /Developer Connect/);
    }
    const missingApi = await fetch(base + '/api/missing');
    assert.equal(missingApi.status, 404);
    assert.equal((await missingApi.json()).error, 'Route not found');
    assert.equal((await fetch(base + '/missing.js')).status, 404);
    const privateRoute = await fetch(base + '/api/auth/me');
    assert.equal(privateRoute.status, 401);
  } finally {
    await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true });
  }
});
