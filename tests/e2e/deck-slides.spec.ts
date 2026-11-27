import { type APIRequestContext, expect, test } from '@playwright/test';
import { randomUUID } from 'node:crypto';
import { readFile } from 'node:fs/promises';

const route = '/api/deck-slides';
const authFiles = 'test-results/.auth';

type SlideRead = {
  slideId: string;
  index: number;
  slide: { blockType: string; title?: string };
};

type DeckRead = { deckId: number; revision: string; slides: SlideRead[] };

async function json<T>(response: Awaited<ReturnType<APIRequestContext['get']>>, status = 200) {
  expect(response.status(), await response.text()).toBe(status);
  return (await response.json()) as T;
}

test('edits one stable slide at a time and deletes it only after browser confirmation', async ({
  browser,
  baseURL,
  request: anonymous,
}) => {
  const fixtures = JSON.parse(await readFile(`${authFiles}/fixtures.json`, 'utf8')) as {
    organisationId: string;
    foreignPresentationId: string;
    presentationId: string;
  };
  const browserAuthor = await browser.newContext({
    baseURL,
    storageState: `${authFiles}/author.json`,
  });
  const requester = await browser.newContext({ baseURL });
  const viewer = await browser.newContext({ baseURL, storageState: `${authFiles}/viewer.json` });
  try {
    const login = await json<{ token: string }>(
      await requester.request.post('/api/users/login', {
        data: { email: 'e2e-author@expand.local', password: 'E2e-author-password-4317' },
      }),
    );
    const headers = { Authorization: `JWT ${login.token}` };
    const { doc } = await json<{ doc: { id: number; lastBuildToken?: string } }>(
      await requester.request.post('/api/presentations?depth=0', {
        headers,
        data: {
          title: `E2E slide CRUD ${randomUUID()}`,
          organisation: Number(fixtures.organisationId),
          language: 'fr',
          slides: [{ blockType: 'cover', title: 'Couverture intacte' }],
        },
      }),
      201,
    );
    const deckId = doc.id;
    const deckPath = `/api/presentations/${deckId}?depth=0`;
    const listPath = `${route}?deckId=${deckId}`;
    const post = (data: Record<string, unknown>) =>
      requester.request.post(route, { headers, data: { deckId, ...data } });
    const list = async () => json<DeckRead>(await requester.request.get(listPath, { headers }));
    expect((await anonymous.get(listPath)).status()).toBe(401);
    const initial = await list();
    expect(initial.slides).toHaveLength(1);
    const cover = initial.slides[0]!;
    expect(cover.slideId).toBeTruthy();
    const beforeBuild = await json<{ lastBuildToken: string }>(
      await requester.request.get(deckPath, { headers }),
    );
    expect(beforeBuild.lastBuildToken).toBeTruthy();
    const inserted = await json<SlideRead & { revision: string; buildQueued: boolean }>(
      await post({
        action: 'insert',
        expectedRevision: initial.revision,
        index: 1,
        slide: { blockType: 'section', title: 'Section ajoutée' },
      }),
    );
    expect(inserted).toMatchObject({ index: 1, buildQueued: true });
    expect(inserted.slideId).toBeTruthy();
    expect(inserted.slideId).not.toBe(cover.slideId);
    const select = `&slideId=${encodeURIComponent(inserted.slideId)}`;
    expect(await json(await requester.request.get(listPath + select, { headers }))).toMatchObject({
      slideId: inserted.slideId,
      index: 1,
      slide: { title: 'Section ajoutée' },
    });

    const edit = (title: string) => ({
      action: 'update',
      slideId: inserted.slideId,
      expectedRevision: inserted.revision,
      patch: { blockType: 'section', title },
    });
    const competing = await Promise.all([
      post(edit('Première édition')),
      post(edit('Seconde édition')),
    ]);
    expect(competing.map((response) => response.status()).sort()).toEqual([200, 409]);
    const winner = await json<SlideRead & { revision: string }>(
      competing.find((response) => response.ok())!,
    );
    const rejected = await json<{ code: string }>(
      competing.find((response) => !response.ok())!,
      409,
    );
    expect(rejected.code).toBe('stale');
    expect((await list()).slides[1]).toEqual({
      slideId: winner.slideId,
      index: winner.index,
      slide: winner.slide,
    });

    const move = {
      action: 'move',
      slideId: inserted.slideId,
      expectedRevision: winner.revision,
      index: 0,
    };
    expect(
      (
        await viewer.request.get(listPath, { headers: { 'Sec-Fetch-Site': 'same-origin' } })
      ).status(),
    ).toBe(200);
    expect(
      (
        await viewer.request.post(route, {
          data: { deckId, ...move },
          headers: { Origin: baseURL! },
        })
      ).status(),
    ).toBe(403);
    expect(
      (
        await requester.request.get(`${route}?deckId=${fixtures.foreignPresentationId}`, {
          headers,
        })
      ).status(),
    ).toBe(404);
    expect((await post({ ...move, deckId: Number(fixtures.foreignPresentationId) })).status()).toBe(
      404,
    );
    expect(
      (
        await requester.request.get(`${route}?deckId=${fixtures.presentationId}${select}`, {
          headers,
        })
      ).status(),
    ).toBe(404);
    expect((await post({ ...move, deckId: Number(fixtures.presentationId) })).status()).toBe(404);
    const moved = await json<SlideRead & { revision: string }>(await post(move));
    expect(moved).toMatchObject({ slideId: inserted.slideId, index: 0, slide: winner.slide });
    expect((await list()).slides.map((slide) => slide.slideId)).toEqual([
      inserted.slideId,
      cover.slideId,
    ]);

    const beforeDelete = await json<{ lastBuildToken: string }>(
      await requester.request.get(deckPath, { headers }),
    );
    expect(beforeDelete.lastBuildToken).not.toBe(beforeBuild.lastBuildToken);
    const deletion = { slideId: inserted.slideId, expectedRevision: moved.revision };
    expect((await post({ action: 'delete', ...deletion })).status()).toBe(400);
    const { confirmationUrl } = await json<{ confirmationUrl: string }>(
      await post({ action: 'prepare-delete', ...deletion }),
    );
    expect((await list()).slides).toHaveLength(2);
    const requesterPage = await requester.newPage();
    expect((await requesterPage.goto(confirmationUrl))?.status()).toBe(403);
    const approvalPage = await browserAuthor.newPage();
    expect((await approvalPage.goto(confirmationUrl))?.status()).toBe(200);
    await approvalPage.getByRole('button', { name: 'Supprimer définitivement' }).click();
    await expect(approvalPage.getByRole('heading')).toContainText('Suppression effectuée');
    expect((await approvalPage.goto(confirmationUrl))?.status()).toBe(409);
    expect((await requester.request.get(listPath + select, { headers })).status()).toBe(404);
    expect((await list()).slides).toEqual([cover]);

    const afterBuild = await json<{ id: number; lastBuildToken: string }>(
      await requester.request.get(deckPath, { headers }),
    );
    expect(afterBuild.id).toBe(deckId);
    expect(afterBuild.lastBuildToken).toBeTruthy();
    expect(afterBuild.lastBuildToken).not.toBe(beforeDelete.lastBuildToken);
  } finally {
    await Promise.all([browserAuthor.close(), requester.close(), viewer.close()]);
  }
});
