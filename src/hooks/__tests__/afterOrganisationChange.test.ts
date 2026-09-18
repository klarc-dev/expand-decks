import { describe, expect, it, vi } from 'vitest';

import { CTX } from '../../lib/context';
import { BUILD_SLIDES_TASK } from '../../jobs/buildSlides';
import { BUILD_STATUS } from '../../lib/status';
import { afterOrganisationChange } from '../afterOrganisationChange';

function makeReq(docs: { id: number }[]) {
  const find = vi.fn().mockResolvedValue({ docs, hasNextPage: false });
  const update = vi.fn();
  const updateOne = vi.fn().mockResolvedValue({});
  const queue = vi.fn().mockResolvedValue({});
  return {
    req: {
      context: {},
      payload: { find, update, db: { updateOne }, jobs: { queue } },
    },
    find,
    update,
    updateOne,
    queue,
  };
}

describe('afterOrganisationChange', () => {
  it('stamps a build token on every deck without re-validating its content', async () => {
    const { req, update, updateOne, queue } = makeReq([{ id: 8 }, { id: 15 }]);
    const doc = { id: 1, name: 'Klarc' };

    const result = await afterOrganisationChange({
      doc,
      operation: 'update',
      req,
    } as never);

    expect(result).toBe(doc);
    expect(req.payload.find).toHaveBeenCalledWith(
      expect.objectContaining({ where: { organisation: { equals: 1 } } }),
    );
    // The collection `update` operation would run full validation of the
    // deck's slides; a single stale deck over a limit must not fail the org save.
    expect(update).not.toHaveBeenCalled();
    expect(updateOne).toHaveBeenCalledTimes(2);
    expect(updateOne.mock.calls[0]?.[0]).toMatchObject({
      collection: 'presentations',
      id: 8,
      data: {
        lastBuildToken: expect.any(String),
        lastBuildRequestedAt: expect.any(String),
        lastBuildStatus: BUILD_STATUS.building,
        lastBuildError: '',
        updatedAt: null,
      },
    });
    expect(queue).toHaveBeenCalledTimes(2);
    expect(queue.mock.calls[1]?.[0]).toMatchObject({
      task: BUILD_SLIDES_TASK,
      input: {
        presentationId: '15',
        buildToken: updateOne.mock.calls[1]?.[0].data.lastBuildToken,
      },
    });
  });

  it('does nothing on create or when the build queue is suppressed', async () => {
    const created = makeReq([{ id: 8 }]);
    await afterOrganisationChange({
      doc: { id: 1 },
      operation: 'create',
      req: created.req,
    } as never);
    expect(created.find).not.toHaveBeenCalled();

    const suppressed = makeReq([{ id: 8 }]);
    suppressed.req.context = { [CTX.skipBuildQueue]: true };
    await afterOrganisationChange({
      doc: { id: 1 },
      operation: 'update',
      req: suppressed.req,
    } as never);
    expect(suppressed.find).not.toHaveBeenCalled();
  });
});
