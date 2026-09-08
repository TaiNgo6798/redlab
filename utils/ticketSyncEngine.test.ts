import { describe, it, expect, vi, beforeEach } from 'vitest';
import { extractTicketId, fetchAndProcessTickets, processMR } from './ticketSyncEngine';
import * as api from './api';

vi.mock('./api');

describe('ticketSyncEngine', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('extractTicketId', () => {
    it('extracts ID from bracketed ticket format [#123]', () => {
      expect(extractTicketId('[#123] Fix login issue')).toBe(123);
    });

    it('extracts ID from hash format #456', () => {
      expect(extractTicketId('#456 Update header component')).toBe(456);
    });

    it('extracts ID from mid-string bracketed format', () => {
      expect(extractTicketId('Draft: [#789] Work in progress')).toBe(789);
    });

    it('returns null when no ticket ID is present', () => {
      expect(extractTicketId('Refactor utils without ticket')).toBeNull();
      expect(extractTicketId('')).toBeNull();
    });
  });

  describe('processMR', () => {
    beforeEach(() => {
      vi.mocked(api.checkMRDiscussions).mockResolvedValue(false);
      vi.mocked(api.getGitlabMR).mockResolvedValue(null);
      vi.mocked(api.getMRLatestPipelineStatus).mockResolvedValue(null);
    });

    it('extracts repo name from web_url correctly', async () => {
      const mr = {
        id: 1,
        iid: 10,
        title: 'Fix issue',
        web_url: 'https://gitlab.example.com/company/frontend-app/-/merge_requests/10',
        state: 'opened' as const,
        project_id: 100,
        has_conflicts: false,
      };

      const result = await processMR('https://gitlab.example.com', 'token', mr, 1);
      expect(result.repo).toBe('frontend-app');
      expect(result.iid).toBe(10);
    });

    it('detects draft from title prefix or draft property', async () => {
      const mr = {
        id: 2,
        iid: 11,
        title: 'Draft: new feature',
        web_url: 'https://gitlab.example.com/company/repo/-/merge_requests/11',
        state: 'opened' as const,
        project_id: 100,
        has_conflicts: false,
      };

      const result = await processMR('https://gitlab.example.com', 'token', mr, 1);
      expect(result.is_draft).toBe(true);
    });

    it('queries discussions and pipeline status for opened MRs', async () => {
      const mr = {
        id: 3,
        iid: 12,
        title: 'Feature MR',
        web_url: 'https://gitlab.example.com/company/repo/-/merge_requests/12',
        state: 'opened' as const,
        project_id: 100,
        has_conflicts: false,
      };

      vi.mocked(api.checkMRDiscussions).mockResolvedValue(true);
      vi.mocked(api.getMRLatestPipelineStatus).mockResolvedValue('failed');

      const result = await processMR('https://gitlab.example.com', 'token', mr, 1);
      expect(result.has_open_review).toBe(true);
      expect(result.has_failed_pipeline).toBe(true);
    });
  });

  describe('fetchAndProcessTickets', () => {
    const mockRedmineUrl = 'https://redmine.test';
    const mockGitlabUrl = 'https://gitlab.test';
    const mockApiKey = 'api-key';
    const mockGitlabToken = 'gl-token';

    const getGitlabUserMock = vi.mocked(api.getGitlabUser);
    const getUserMRsMock = vi.mocked(api.getUserMRs);
    const searchGitlabMRsMock = vi.mocked(api.searchGitlabMRs);
    const getGitlabMRMock = vi.mocked(api.getGitlabMR);
    const getMRLatestPipelineStatusMock = vi.mocked(api.getMRLatestPipelineStatus);
    const checkMRDiscussionsMock = vi.mocked(api.checkMRDiscussions);
    const getRedmineIssueMock = vi.mocked(api.getRedmineIssue);
    const getResolvedTicketsMock = vi.mocked(api.getResolvedTickets);

    beforeEach(() => {
      getGitlabUserMock.mockResolvedValue({ id: 1, username: 'testuser', name: 'Test User' });
      getUserMRsMock.mockResolvedValue([]);
      searchGitlabMRsMock.mockResolvedValue([]);
      getGitlabMRMock.mockResolvedValue(null);
      getMRLatestPipelineStatusMock.mockResolvedValue(null);
      checkMRDiscussionsMock.mockResolvedValue(false);
      getRedmineIssueMock.mockResolvedValue(null);
      getResolvedTicketsMock.mockResolvedValue([]);
    });

    it('returns empty list if user has no MRs and no resolved tickets', async () => {
      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);
      expect(result).toEqual([]);
    });

    it('discovers resolved tickets with merged MRs from Redmine even if no open MRs exist', async () => {
      getUserMRsMock.mockResolvedValue([]);
      getResolvedTicketsMock.mockResolvedValue([
        {
          id: 13381,
          title: 'Remove legacy session cookie',
          url: 'https://redmine.test/issues/13381',
        },
      ]);
      searchGitlabMRsMock.mockResolvedValue([
        {
          id: 19444,
          iid: 2147,
          title: '[#13381] Drop leftover session comments',
          web_url: 'https://gitlab.test/core-api/-/merge_requests/2147',
          state: 'merged',
          project_id: 201,
          has_conflicts: false,
        },
      ]);
      getRedmineIssueMock.mockResolvedValue({
        id: 13381,
        subject: 'Remove legacy session cookie and proxy auth gate',
        status: { id: 3, name: 'Resolved' },
      });

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(13381);
      expect(result[0].title).toBe('Remove legacy session cookie and proxy auth gate');
      expect(result[0].status).toBe('Resolved');
      expect(result[0].mrs).toHaveLength(1);
      expect(result[0].mrs[0].state).toBe('merged');
      expect(result[0].mrs[0].repo).toBe('core-api');
    });

    it('includes resolved Redmine tickets even if 0 MRs are found on GitLab', async () => {
      getUserMRsMock.mockResolvedValue([]);
      getResolvedTicketsMock.mockResolvedValue([
        {
          id: 99999,
          title: 'Non-code task',
          url: 'https://redmine.test/issues/99999',
        },
      ]);
      searchGitlabMRsMock.mockResolvedValue([]);
      getRedmineIssueMock.mockResolvedValue({
        id: 99999,
        subject: 'Non-code task',
        status: { id: 3, name: 'Resolved' },
      });

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(99999);
      expect(result[0].title).toBe('Non-code task');
      expect(result[0].status).toBe('Resolved');
      expect(result[0].mrs).toEqual([]);
    });

    it('ignores tickets with 0 MRs if Redmine issue is no longer Resolved', async () => {
      getUserMRsMock.mockResolvedValue([]);
      getResolvedTicketsMock.mockResolvedValue([
        {
          id: 99999,
          title: 'Non-code task',
          url: 'https://redmine.test/issues/99999',
        },
      ]);
      searchGitlabMRsMock.mockResolvedValue([]);
      getRedmineIssueMock.mockResolvedValue({
        id: 99999,
        subject: 'Non-code task',
        status: { id: 2, name: 'In Progress' },
      });

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      expect(result).toEqual([]);
    });

    it('collects user MRs first, then fetches matching Redmine ticket', async () => {
      getUserMRsMock.mockResolvedValue([
        {
          id: 10,
          iid: 1,
          title: '[#100] Implement user profile',
          web_url: 'https://gitlab.test/frontend/-/merge_requests/1',
          state: 'opened',
          project_id: 101,
          has_conflicts: false,
        },
      ]);
      getRedmineIssueMock.mockResolvedValue({
        id: 100,
        subject: 'User Profile Settings',
        status: { id: 2, name: 'In Progress' },
      });

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(100);
      expect(result[0].title).toBe('User Profile Settings');
      expect(result[0].status).toBe('In Progress');
      expect(result[0].url).toBe('https://redmine.test/issues/100');
      expect(result[0].mrs).toHaveLength(1);
      expect(result[0].mrs[0].repo).toBe('frontend');
      expect(result[0].mrs[0].iid).toBe(1);
    });

    it('groups multiple MRs with the same ticket number across repos under one ticket', async () => {
      getUserMRsMock.mockResolvedValue([
        {
          id: 10,
          iid: 1,
          title: '[#100] Frontend part of profile',
          web_url: 'https://gitlab.test/frontend/-/merge_requests/1',
          state: 'opened',
          project_id: 101,
          has_conflicts: false,
        },
        {
          id: 20,
          iid: 2,
          title: '[#100] Backend API for profile',
          web_url: 'https://gitlab.test/backend/-/merge_requests/2',
          state: 'opened',
          project_id: 102,
          has_conflicts: false,
        },
      ]);
      searchGitlabMRsMock.mockResolvedValue([
        {
          id: 30,
          iid: 3,
          title: '[#100] Infra config for profile',
          web_url: 'https://gitlab.test/infra/-/merge_requests/3',
          state: 'merged',
          project_id: 103,
          has_conflicts: false,
        },
      ]);
      getRedmineIssueMock.mockResolvedValue({
        id: 100,
        subject: 'Profile Feature Across Repos',
        status: { id: 3, name: 'Resolved' },
      });

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(100);
      expect(result[0].title).toBe('Profile Feature Across Repos');
      expect(result[0].status).toBe('Resolved');
      // Contains MRs from frontend, backend, and infra repos
      expect(result[0].mrs).toHaveLength(3);
      const repos = result[0].mrs.map((m) => m.repo).sort();
      expect(repos).toEqual(['backend', 'frontend', 'infra']);
    });

    it('shows "No ticket" for MRs without a ticket number in title', async () => {
      getUserMRsMock.mockResolvedValue([
        {
          id: 50,
          iid: 5,
          title: 'Quick fix without ticket',
          web_url: 'https://gitlab.test/docs/-/merge_requests/5',
          state: 'opened',
          project_id: 105,
          has_conflicts: false,
        },
      ]);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBeNull();
      expect(result[0].title).toBe('No ticket');
      expect(result[0].status).toBeUndefined();
      expect(result[0].url).toBeUndefined();
      expect(result[0].mrs).toHaveLength(1);
      expect(result[0].mrs[0].repo).toBe('docs');
    });

    it('shows "No ticket" when Redmine issue cannot be found / 404', async () => {
      getUserMRsMock.mockResolvedValue([
        {
          id: 60,
          iid: 6,
          title: '[#9999] Unknown Redmine issue',
          web_url: 'https://gitlab.test/app/-/merge_requests/6',
          state: 'opened',
          project_id: 106,
          has_conflicts: false,
        },
      ]);
      getRedmineIssueMock.mockResolvedValue(null);

      const result = await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBeNull();
      expect(result[0].title).toBe('No ticket');
      expect(result[0].status).toBeUndefined();
      expect(result[0].mrs).toHaveLength(1);
    });

    it('triggers onProgress callback as processing advances', async () => {
      getUserMRsMock.mockResolvedValue([
        {
          id: 70,
          iid: 7,
          title: '[#201] Ticket A',
          web_url: 'https://gitlab.test/repo-a/-/merge_requests/7',
          state: 'opened',
          project_id: 107,
          has_conflicts: false,
        },
        {
          id: 71,
          iid: 8,
          title: '[#202] Ticket B',
          web_url: 'https://gitlab.test/repo-b/-/merge_requests/8',
          state: 'opened',
          project_id: 108,
          has_conflicts: false,
        },
      ]);
      const progressMock = vi.fn();

      await fetchAndProcessTickets(mockRedmineUrl, mockApiKey, mockGitlabUrl, mockGitlabToken, progressMock);

      expect(progressMock).toHaveBeenCalled();
      expect(progressMock).toHaveBeenLastCalledWith(100);
    });
  });
});
