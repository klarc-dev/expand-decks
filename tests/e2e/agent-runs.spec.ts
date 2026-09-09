import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const E2E_ADMIN_AUTH_FILE = resolve('test-results/.auth/admin.json');
const E2E_AUTHOR_AUTH_FILE = resolve('test-results/.auth/author.json');
const E2E_VIEWER_AUTH_FILE = resolve('test-results/.auth/viewer.json');
const E2E_FIXTURES_FILE = resolve('test-results/.auth/fixtures.json');

type Fixtures = { agentRunId: string; presentationId: string };

async function fixtures(): Promise<Fixtures> {
  return JSON.parse(await readFile(E2E_FIXTURES_FILE, 'utf8')) as Fixtures;
}

async function authenticatedPage(
  browser: import('@playwright/test').Browser,
  storageState: string,
  baseURL: string,
) {
  const context = await browser.newContext({ storageState, baseURL });
  const page = await context.newPage();
  await page.goto('/admin');
  return { context, page };
}

test.describe('agent run status, commands, and feedback', () => {
  const baseURL = process.env.NEXT_PUBLIC_SERVER_URL || 'http://localhost:4317';

  test('anonymous requests are rejected', async ({ request }) => {
    const data = await fixtures();
    expect((await request.get(`/api/agent-draft/${data.agentRunId}`)).status()).toBe(401);
    expect(
      (
        await request.post(`/api/agent-draft/${data.agentRunId}`, {
          data: { action: 'cancel' },
        })
      ).status(),
    ).toBe(401);
    expect(
      (
        await request.post('/api/agent-draft/feedback', {
          data: { presentationId: data.presentationId, type: 'thumbs', value: 1 },
        })
      ).status(),
    ).toBe(401);
  });

  for (const [role, storageState] of [
    ['author', E2E_AUTHOR_AUTH_FILE],
    ['viewer', E2E_VIEWER_AUTH_FILE],
  ] as const) {
    test(`${role} can poll an accessible agent run`, async ({ browser }) => {
      const data = await fixtures();
      const { context, page } = await authenticatedPage(browser, storageState, baseURL);
      const response = await page.evaluate(async (runId) => {
        const result = await fetch(`/api/agent-draft/${runId}`);
        return { body: await result.json(), status: result.status };
      }, data.agentRunId);
      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        runId: data.agentRunId,
        status: 'succeeded',
        phase: 'complete',
        command: 'start',
        error: null,
      });
      expect(response.body.events).toEqual([{ ts: 1, phase: 'complete' }]);
      await context.close();
    });
  }

  test('viewer cannot control an agent run or submit feedback', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_VIEWER_AUTH_FILE, baseURL);
    const statuses = await page.evaluate(async ({ agentRunId, presentationId }) => {
      const cancel = await fetch(`/api/agent-draft/${agentRunId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'cancel' }),
      });
      const feedback = await fetch('/api/agent-draft/feedback', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ presentationId, type: 'thumbs', value: 1 }),
      });
      return { cancel: cancel.status, feedback: feedback.status };
    }, data);
    expect(statuses).toEqual({ cancel: 403, feedback: 403 });
    await context.close();
  });

  test('author gets deterministic conflict responses for invalid run transitions', async ({
    browser,
  }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_AUTHOR_AUTH_FILE, baseURL);
    const statuses = await page.evaluate(async (runId) => {
      const restart = await fetch(`/api/agent-draft/${runId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'restart' }),
      });
      const resume = await fetch(`/api/agent-draft/${runId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'resume', approved: true }),
      });
      const timeTravel = await fetch(`/api/agent-draft/${runId}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ action: 'time-travel', step: 'validate' }),
      });
      return { restart: restart.status, resume: resume.status, timeTravel: timeTravel.status };
    }, data.agentRunId);
    expect(statuses).toEqual({ restart: 409, resume: 409, timeTravel: 403 });
    await context.close();
  });

  test('rejects malformed commands and missing runs without side effects', async ({ browser }) => {
    const data = await fixtures();
    const { context, page } = await authenticatedPage(browser, E2E_ADMIN_AUTH_FILE, baseURL);
    const statuses = await page.evaluate(
      async ({ runId, presentationId }) => {
        const malformed = await fetch(`/api/agent-draft/${runId}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ action: 'unknown' }),
        });
        const missing = await fetch('/api/agent-draft/e2e-missing-run');
        const invalidFeedback = await fetch('/api/agent-draft/feedback', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ presentationId, type: 'rating', value: 6 }),
        });
        return {
          malformed: malformed.status,
          missing: missing.status,
          invalidFeedback: invalidFeedback.status,
        };
      },
      { runId: data.agentRunId, presentationId: data.presentationId },
    );
    expect(statuses).toEqual({ malformed: 400, missing: 404, invalidFeedback: 400 });
    await context.close();
  });
});
