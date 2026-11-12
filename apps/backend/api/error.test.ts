import { analytics } from '@repo/analytics';

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
  UnprocessableError,
  getErrorStatus,
  handleError,
} from './error';

describe('errors', () => {
  it.each([
    [new BadRequestError('bad'), 400],
    [new UnauthorizedError(), 401],
    [new ForbiddenError('no'), 403],
    [new NotFoundError('missing'), 404],
    [new ConflictError('busy'), 409],
    [new UnprocessableError('failed'), 422],
    [new Error('boom'), 500],
    ['not even an error', 500],
  ])('maps %s to %i', (error, status) => {
    expect(getErrorStatus(error)).toBe(status);
  });

  describe('handleError', () => {
    /** Spies on exception reporting for one test */
    const spyOnReports = () => {
      const capture = vi.spyOn(analytics, 'captureException');
      onTestFinished(() => capture.mockRestore());
      return capture;
    };

    it("doesn't report errors the caller caused", async () => {
      const capture = spyOnReports();

      await handleError({ error: new ForbiddenError('You are not a member of that organization') });

      expect(capture).not.toHaveBeenCalled();
    });

    it('reports unexpected errors with their properties', async () => {
      const capture = spyOnReports();
      const error = new Error('boom');

      await handleError({ error, properties: { toolName: 'run-code' } });

      expect(capture).toHaveBeenCalledWith(error, { toolName: 'run-code' });
    });
  });
});
