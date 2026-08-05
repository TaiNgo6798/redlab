import { describe, it, expect, vi, beforeEach } from 'vitest';
import { evaluateTicket, fetchAndProcessTickets } from './ticketSyncEngine';
import * as api from './api';
import type { ProcessedMR } from '../sidepanel/domains/ticket-sync/types/index';

vi.mock('./api');

describe('ticketSyncEngine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('evaluateTicket', () => {
    const createMR = (overrides: Partial<ProcessedMR>): ProcessedMR => ({
      iid: 1,
      repo: 'test-repo',
      url: 'https://gitlab.com/test-repo/-/merge_requests/1',
      state: 'opened',
      has_conflicts: false,
      has_open_review: false,
      is_draft: false,
      has_failed_pipeline: false,
      ...overrides,
    });

    it('should return ready if all MRs are merged and ticket is resolved', () => {
      const mrs = [createMR({ state: 'merged' })];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['ready'],
      });
    });

    it('should return others if all MRs are merged but ticket is NOT resolved', () => {
      const mrs = [createMR({ state: 'merged' })];
      expect(evaluateTicket(mrs, false)).toEqual({
        evaluations: ['others'],
      });
    });

    it('should return draft if any MR is draft', () => {
      const mrs = [
        createMR({ state: 'opened' }),
        createMR({ is_draft: true })
      ];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['draft'],
      });
    });

    it('should return conflicts if any MR has conflicts', () => {
      const mrs = [createMR({ has_conflicts: true })];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['conflicts'],
      });
    });

    it('should return test_failed if any MR has failed pipeline', () => {
      const mrs = [createMR({ has_failed_pipeline: true })];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['test_failed'],
      });
    });

    it('should return review if any MR has open review', () => {
      const mrs = [createMR({ has_open_review: true })];
      expect(evaluateTicket(mrs, false)).toEqual({
        evaluations: ['review'],
      });
    });

    it('should return open if no special states and ticket is resolved', () => {
      const mrs = [createMR({ state: 'opened' })];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['open'],
      });
    });

    it('should return others if no special states and ticket is NOT resolved', () => {
      const mrs = [createMR({ state: 'opened' })];
      expect(evaluateTicket(mrs, false)).toEqual({
        evaluations: ['others'],
      });
    });

    it('should prioritize draft exclusively over conflicts, test_failed, and review', () => {
      const mrs = [createMR({ is_draft: true, has_conflicts: true, has_failed_pipeline: true, has_open_review: true })];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['draft'],
      });
    });

    it('should stack conflicts + review into both groups', () => {
      const mrs = [createMR({ has_conflicts: true, has_open_review: true })];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['conflicts', 'review'],
      });
    });

    it('should stack conflicts + test_failed + review into all three groups', () => {
      const mrs = [createMR({ has_conflicts: true, has_failed_pipeline: true, has_open_review: true })];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['test_failed', 'conflicts', 'review'],
      });
    });

    it('should stack test_failed + review into both groups', () => {
      const mrs = [createMR({ has_failed_pipeline: true, has_open_review: true })];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['test_failed', 'review'],
      });
    });

    it('should stack when problems are split across different MRs on the same ticket', () => {
      // multi-MR ticket: one MR failed+review, one clean open, one failed+review
      const mrs = [
        createMR({ iid: 10, has_failed_pipeline: true, has_open_review: true }),
        createMR({ iid: 3 }),
        createMR({ iid: 11, has_failed_pipeline: true, has_open_review: true }),
      ];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['test_failed', 'review'],
      });
    });

    it('should stack when each problem lives on a different MR', () => {
      const mrs = [
        createMR({ iid: 1, has_conflicts: true }),
        createMR({ iid: 2, has_failed_pipeline: true }),
        createMR({ iid: 3, has_open_review: true }),
        createMR({ iid: 4 }), // clean open sibling
      ];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['test_failed', 'conflicts', 'review'],
      });
    });

    it('should treat mixed merged + open-review as review (not ready)', () => {
      const mrs = [
        createMR({ iid: 1, state: 'merged' }),
        createMR({ iid: 2, has_open_review: true }),
      ];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['review'],
      });
    });

    it('should treat draft on any MR as exclusive even if siblings are merged', () => {
      const mrs = [
        createMR({ iid: 1, state: 'merged' }),
        createMR({ iid: 2, is_draft: true, has_failed_pipeline: true }),
      ];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['draft'],
      });
    });

    it('should treat empty MR list as open/others, not ready', () => {
      expect(evaluateTicket([], true)).toEqual({
        evaluations: ['open'],
      });
      expect(evaluateTicket([], false)).toEqual({
        evaluations: ['others'],
      });
    });

    it('should not treat closed MRs as ready unless every MR is merged', () => {
      const mrs = [
        createMR({ iid: 1, state: 'closed' }),
        createMR({ iid: 2, state: 'opened' }),
      ];
      expect(evaluateTicket(mrs, true)).toEqual({
        evaluations: ['open'],
      });
    });

    it('should return conflicts only (not open) when sole problem is conflict', () => {
      expect(evaluateTicket([createMR({ has_conflicts: true })], true).evaluations).toEqual([
        'conflicts',
      ]);
    });
  });

  describe('fetchAndProcessTickets', () => {
    const mockRedmineUrl = 'https://redmine.test';
    const mockGitlabUrl = 'https://gitlab.test';
    const mockApiKey = 'api-key';
    const mockGitlabToken = 'gl-token';

    const getResolvedTicketsMock = vi.mocked(api.getResolvedTickets);
    const getGitlabUserMock = vi.mocked(api.getGitlabUser);
    const searchGitlabMRsMock = vi.mocked(api.searchGitlabMRs);
    const getGitlabMRMock = vi.mocked(api.getGitlabMR);
    const getMRLatestPipelineStatusMock = vi.mocked(api.getMRLatestPipelineStatus);
    const checkMRDiscussionsMock = vi.mocked(api.checkMRDiscussions);
    const getOtherUserMRsMock = vi.mocked(api.getOtherUserMRs);

    beforeEach(() => {
      getGitlabUserMock.mockResolvedValue({ id: 1, username: 'testuser', name: 'Test User' });
      getResolvedTicketsMock.mockResolvedValue([]);
      searchGitlabMRsMock.mockResolvedValue([]);
      getGitlabMRMock.mockResolvedValue(null);
      getMRLatestPipelineStatusMock.mockResolvedValue(null);
      checkMRDiscussionsMock.mockResolvedValue(false);
      getOtherUserMRsMock.mockResolvedValue([]);
    });

    it('should return empty groups if no tickets and no other MRs', async () => {
      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      expect(result).toEqual([]);
    });

    it('should process resolved tickets with MRs', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 100, title: 'Test Ticket', url: 'https://redmine.test/issues/100' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 10,
        iid: 10,
        title: 'MR for 100',
        web_url: 'https://gitlab.test/repo/-/merge_requests/10',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
      }]);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      const openGroup = result.find(g => g.key === 'open');
      expect(openGroup).toBeDefined();
      expect(openGroup!.tickets[0].id).toBe(100);
      expect(openGroup!.tickets[0].evaluations).toEqual(['open']);
      expect(openGroup!.tickets[0].mrs).toHaveLength(1);
    });

    it('should query discussions for non-merged MRs', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 101, title: 'Review Ticket', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 11,
        iid: 11,
        title: 'MR for 101',
        web_url: 'https://gitlab.test/repo/-/merge_requests/11',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
      }]);
      checkMRDiscussionsMock.mockResolvedValue(true);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      const reviewGroup = result.find(g => g.key === 'review');
      expect(reviewGroup).toBeDefined();
      expect(reviewGroup!.tickets[0].id).toBe(101);
      expect(reviewGroup!.tickets[0].evaluations).toEqual(['review']);
      expect(reviewGroup!.tickets[0].mrs[0].has_open_review).toBe(true);
    });

    it('should use single-MR detail for has_conflicts when list says false', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 102, title: 'Conflict Ticket', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 12,
        iid: 12,
        title: 'MR for 102',
        web_url: 'https://gitlab.test/repo/-/merge_requests/12',
        state: 'opened',
        project_id: 1,
        has_conflicts: false, // list endpoint often lies
      }]);
      getGitlabMRMock.mockResolvedValue({
        id: 12,
        iid: 12,
        title: 'MR for 102',
        web_url: 'https://gitlab.test/repo/-/merge_requests/12',
        state: 'opened',
        project_id: 1,
        has_conflicts: true,
      });
      checkMRDiscussionsMock.mockResolvedValue(true);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      const conflictsGroup = result.find(g => g.key === 'conflicts');
      const reviewGroup = result.find(g => g.key === 'review');
      expect(conflictsGroup).toBeDefined();
      expect(reviewGroup).toBeDefined();
      // Same ticket appears in both groups
      expect(conflictsGroup!.tickets[0].id).toBe(102);
      expect(reviewGroup!.tickets[0].id).toBe(102);
      expect(conflictsGroup!.tickets[0].evaluations).toEqual(['conflicts', 'review']);
      expect(conflictsGroup!.tickets[0].mrs[0].has_conflicts).toBe(true);
    });

    it('should use pipelines endpoint for failed test when head_pipeline is missing', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 103, title: 'Failed CI Ticket', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 13,
        iid: 13,
        title: 'MR for 103',
        web_url: 'https://gitlab.test/repo/-/merge_requests/13',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
        // no head_pipeline — common on list responses
      }]);
      getMRLatestPipelineStatusMock.mockResolvedValue('failed');
      checkMRDiscussionsMock.mockResolvedValue(true);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      const failedGroup = result.find(g => g.key === 'test_failed');
      const reviewGroup = result.find(g => g.key === 'review');
      expect(failedGroup).toBeDefined();
      expect(reviewGroup).toBeDefined();
      expect(failedGroup!.tickets[0].id).toBe(103);
      expect(reviewGroup!.tickets[0].id).toBe(103);
      expect(failedGroup!.tickets[0].evaluations).toEqual(['test_failed', 'review']);
      expect(failedGroup!.tickets[0].mrs[0].has_failed_pipeline).toBe(true);
    });

    it('should process untracked MRs and categorize them correctly', async () => {
      // Must provide a dummy resolved ticket so fetchAndProcessTickets doesn't return early
      getResolvedTicketsMock.mockResolvedValue([{ id: 999, title: "Dummy", url: "url" }]);
      getOtherUserMRsMock.mockResolvedValue([{
        id: 20,
        iid: 20,
        title: '[#200] Untracked MR',
        web_url: 'https://gitlab.test/repo/-/merge_requests/20',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
      }]);
      checkMRDiscussionsMock.mockResolvedValue(true); // Should place in 'review' instead of 'others'

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      const reviewGroup = result.find(g => g.key === 'review');
      expect(reviewGroup).toBeDefined();
      expect(reviewGroup!.tickets[0].id).toBe(200);
      expect(reviewGroup!.tickets[0].evaluations).toEqual(['review']);
    });

    it('should merge untracked MRs with existing tickets and re-evaluate', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 300, title: 'Merged Ticket', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 30,
        iid: 30,
        title: 'MR 1 for 300',
        web_url: 'https://gitlab.test/repo/-/merge_requests/30',
        state: 'merged',
        project_id: 1,
        has_conflicts: false,
      }]);
      getOtherUserMRsMock.mockResolvedValue([{
        id: 31,
        iid: 31,
        title: '[#300] MR 2 for 300',
        web_url: 'https://gitlab.test/repo/-/merge_requests/31',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
        draft: true, // Should override 'ready' to 'draft'
      }]);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      const draftGroup = result.find(g => g.key === 'draft');
      expect(draftGroup).toBeDefined();
      expect(draftGroup!.tickets[0].id).toBe(300);
      expect(draftGroup!.tickets[0].evaluations).toEqual(['draft']);
      expect(draftGroup!.tickets[0].mrs).toHaveLength(2);
    });

    it('should handle untracked MRs without a ticket ID', async () => {
      // Must provide a dummy resolved ticket so fetchAndProcessTickets doesn't return early
      getResolvedTicketsMock.mockResolvedValue([{ id: 999, title: "Dummy", url: "url" }]);
      getOtherUserMRsMock.mockResolvedValue([{
        id: 40,
        iid: 40,
        title: 'Random MR without ID',
        web_url: 'https://gitlab.test/repo/-/merge_requests/40',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
      }]);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      const othersGroup = result.find(g => g.key === 'others');
      expect(othersGroup).toBeDefined();
      expect(othersGroup!.tickets[0].id).toBeLessThan(0); // Should be negative
      expect(othersGroup!.tickets[0].evaluations).toEqual(['others']);
    });

    it('should gracefully handle errors in fetching MRs for a ticket', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 500, title: 'Error Ticket', url: 'url' }]);
      searchGitlabMRsMock.mockRejectedValue(new Error('API Error'));

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      expect(result).toEqual([]); // Fails silently for that ticket, and returns nothing since it's the only one
    });

    it('should trigger onProgress callback', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 600, title: 'Ticket 1', url: 'url' }, { id: 601, title: 'Ticket 2', url: 'url' }]);
      const progressMock = vi.fn();
      await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken, progressMock);

      expect(progressMock).toHaveBeenCalled();
      expect(progressMock).toHaveBeenLastCalledWith(100);
    });

    it('should not mark pipeline as failed for success / running / canceled', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 104, title: 'CI ok', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 14,
        iid: 14,
        title: 'MR for 104',
        web_url: 'https://gitlab.test/repo/-/merge_requests/14',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
      }]);

      for (const status of ['success', 'running', 'canceled', 'pending', 'skipped'] as const) {
        getMRLatestPipelineStatusMock.mockResolvedValue(status);
        const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
        const failedGroup = result.find(g => g.key === 'test_failed');
        expect(failedGroup).toBeUndefined();
        const openGroup = result.find(g => g.key === 'open');
        expect(openGroup?.tickets[0]?.mrs[0]?.has_failed_pipeline).toBe(false);
      }
    });

    it('should fall back to head_pipeline.failed when pipelines endpoint returns null', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 105, title: 'Head pipeline fail', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 15,
        iid: 15,
        title: 'MR for 105',
        web_url: 'https://gitlab.test/repo/-/merge_requests/15',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
        head_pipeline: { id: 1, status: 'failed' },
      }]);
      getMRLatestPipelineStatusMock.mockResolvedValue(null);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      const failedGroup = result.find(g => g.key === 'test_failed');
      expect(failedGroup).toBeDefined();
      expect(failedGroup!.tickets[0].mrs[0].has_failed_pipeline).toBe(true);
    });

    it('should fall back to detail head_pipeline when list has none and pipeline status is null', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 106, title: 'Detail pipeline', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 16,
        iid: 16,
        title: 'MR for 106',
        web_url: 'https://gitlab.test/repo/-/merge_requests/16',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
      }]);
      getGitlabMRMock.mockResolvedValue({
        id: 16,
        iid: 16,
        title: 'MR for 106',
        web_url: 'https://gitlab.test/repo/-/merge_requests/16',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
        head_pipeline: { id: 99, status: 'failed' },
      });
      getMRLatestPipelineStatusMock.mockResolvedValue(null);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      expect(result.find(g => g.key === 'test_failed')).toBeDefined();
      // head_pipeline already known from detail — do not hit pipelines list
      expect(getMRLatestPipelineStatusMock).not.toHaveBeenCalled();
    });

    it('should not call pipelines endpoint when list already has head_pipeline', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 111, title: 'List head', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 21,
        iid: 21,
        title: 'MR for 111',
        web_url: 'https://gitlab.test/repo/-/merge_requests/21',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
        head_pipeline: { id: 1, status: 'failed' },
      }]);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      expect(result.find(g => g.key === 'test_failed')).toBeDefined();
      expect(getMRLatestPipelineStatusMock).not.toHaveBeenCalled();
    });

    it('should still collect other user MRs when there are zero resolved tickets', async () => {
      getResolvedTicketsMock.mockResolvedValue([]);
      getOtherUserMRsMock.mockResolvedValue([{
        id: 22,
        iid: 22,
        title: 'Orphan open MR',
        web_url: 'https://gitlab.test/repo/-/merge_requests/22',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
      }]);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      const othersGroup = result.find(g => g.key === 'others');
      expect(othersGroup).toBeDefined();
      expect(othersGroup!.tickets[0].id).toBeLessThan(0);
    });

    it('should skip pipeline/detail enrichment for merged MRs', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 107, title: 'All merged', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 17,
        iid: 17,
        title: 'MR for 107',
        web_url: 'https://gitlab.test/repo/-/merge_requests/17',
        state: 'merged',
        project_id: 1,
        has_conflicts: false,
      }]);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      expect(getGitlabMRMock).not.toHaveBeenCalled();
      expect(getMRLatestPipelineStatusMock).not.toHaveBeenCalled();
      expect(checkMRDiscussionsMock).not.toHaveBeenCalled();
      expect(result.find(g => g.key === 'ready')).toBeDefined();
    });

    it('should keep all sibling MRs on a multi-group ticket', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 1001, title: 'Multi MR ticket', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([
        {
          id: 10,
          iid: 10,
          title: '#1001 app-ui',
          web_url: 'https://gitlab.test/demo-org/app-ui/-/merge_requests/10',
          state: 'opened',
          project_id: 2,
          has_conflicts: false,
        },
        {
          id: 3,
          iid: 3,
          title: '#1001 infra',
          web_url: 'https://gitlab.test/demo-org/infra/-/merge_requests/3',
          state: 'opened',
          project_id: 1,
          has_conflicts: false,
        },
        {
          id: 11,
          iid: 11,
          title: '#1001 app-api',
          web_url: 'https://gitlab.test/demo-org/app-api/-/merge_requests/11',
          state: 'opened',
          project_id: 3,
          has_conflicts: false,
        },
      ]);
      getMRLatestPipelineStatusMock.mockImplementation(async (_u, _t, _p, iid) => {
        if (iid === 10 || iid === 11) return 'failed';
        return 'success';
      });
      checkMRDiscussionsMock.mockImplementation(async (_u, _t, _p, iid) => {
        return iid === 10 || iid === 11;
      });

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      const failedGroup = result.find(g => g.key === 'test_failed');
      const reviewGroup = result.find(g => g.key === 'review');

      expect(failedGroup).toBeDefined();
      expect(reviewGroup).toBeDefined();
      // Same ticket, full MR list in both groups
      expect(failedGroup!.tickets[0].mrs).toHaveLength(3);
      expect(reviewGroup!.tickets[0].mrs).toHaveLength(3);
      expect(failedGroup!.tickets[0].evaluations).toEqual(['test_failed', 'review']);
      expect(failedGroup!.tickets[0].mrs.map(m => m.repo).sort()).toEqual([
        'app-api',
        'app-ui',
        'infra',
      ]);
    });

    it('should detect draft from title prefix when draft flag is false', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 108, title: 'Draft title', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 18,
        iid: 18,
        title: 'Draft: WIP #108',
        web_url: 'https://gitlab.test/repo/-/merge_requests/18',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
        draft: false,
      }]);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      expect(result.find(g => g.key === 'draft')).toBeDefined();
      expect(result.find(g => g.key === 'draft')!.tickets[0].mrs[0].is_draft).toBe(true);
    });

    it('should continue other tickets when one ticket search fails', async () => {
      getResolvedTicketsMock.mockResolvedValue([
        { id: 501, title: 'Broken', url: 'url' },
        { id: 502, title: 'Ok', url: 'url' },
      ]);
      searchGitlabMRsMock.mockImplementation(async (_u, _t, ticketId) => {
        if (ticketId === 501) throw new Error('boom');
        return [{
          id: 50,
          iid: 50,
          title: 'MR for 502',
          web_url: 'https://gitlab.test/repo/-/merge_requests/50',
          state: 'opened',
          project_id: 1,
          has_conflicts: false,
        }];
      });

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      const openGroup = result.find(g => g.key === 'open');
      expect(openGroup?.tickets.map(t => t.id)).toEqual([502]);
    });

    it('should skip tickets with zero matching MRs', async () => {
      getResolvedTicketsMock.mockResolvedValue([
        { id: 700, title: 'No MRs', url: 'url' },
        { id: 701, title: 'Has MR', url: 'url' },
      ]);
      searchGitlabMRsMock.mockImplementation(async (_u, _t, ticketId) => {
        if (ticketId === 700) return [];
        return [{
          id: 70,
          iid: 70,
          title: 'MR for 701',
          web_url: 'https://gitlab.test/repo/-/merge_requests/70',
          state: 'merged',
          project_id: 1,
          has_conflicts: false,
        }];
      });

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      expect(result.flatMap(g => g.tickets).map(t => t.id)).toEqual([701]);
    });

    it('should use unknown repo when web_url does not match pattern', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 109, title: 'Odd url', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 19,
        iid: 19,
        title: 'MR for 109',
        web_url: 'https://gitlab.test/weird-path/19',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
      }]);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      expect(result.find(g => g.key === 'open')!.tickets[0].mrs[0].repo).toBe('unknown');
    });

    it('should hide empty groups from the result', async () => {
      getResolvedTicketsMock.mockResolvedValue([{ id: 110, title: 'Only open', url: 'url' }]);
      searchGitlabMRsMock.mockResolvedValue([{
        id: 20,
        iid: 20,
        title: 'MR for 110',
        web_url: 'https://gitlab.test/repo/-/merge_requests/20',
        state: 'opened',
        project_id: 1,
        has_conflicts: false,
      }]);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      expect(result.map(g => g.key)).toEqual(['open']);
    });
  });
});
