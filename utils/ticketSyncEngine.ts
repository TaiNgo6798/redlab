import {
  getGitlabUser,
  getUserMRs,
  searchGitlabMRs,
  getGitlabMR,
  getMRLatestPipelineStatus,
  checkMRDiscussions,
  getRedmineIssue,
  getResolvedTickets,
  type GitlabMR,
} from './api';
import type { ProcessedTicket, ProcessedMR } from '../sidepanel/domains/ticket-sync/types/index';

/** Extract ticket ID from MR title (e.g. [#123], #123). */
export function extractTicketId(title: string): number | null {
  const match = title.match(/\[?#(\d+)\]?/);
  if (match && match[1]) {
    const id = parseInt(match[1], 10);
    if (!Number.isNaN(id) && id > 0) return id;
  }
  return null;
}

export async function processMR(
  gitlabUrl: string,
  gitlabToken: string,
  mr: GitlabMR,
  gitlabUserId: number,
): Promise<ProcessedMR> {
  const isOpen = mr.state === 'opened';

  // Discussions + single-MR detail (conflicts + head_pipeline) in parallel.
  const [hasOpenReview, detail] = await Promise.all([
    mr.state !== 'merged'
      ? checkMRDiscussions(gitlabUrl, gitlabToken, mr.project_id, mr.iid, gitlabUserId)
      : Promise.resolve(false),
    isOpen
      ? getGitlabMR(gitlabUrl, gitlabToken, mr.project_id, mr.iid)
      : Promise.resolve(null),
  ]);

  const source = detail ?? mr;
  const headPipeline = source.head_pipeline ?? mr.head_pipeline;

  // Pipelines endpoint only when head_pipeline is missing on list + detail.
  let hasFailedPipeline = headPipeline?.status === 'failed';
  if (isOpen && !headPipeline) {
    const pipelineStatus = await getMRLatestPipelineStatus(
      gitlabUrl,
      gitlabToken,
      mr.project_id,
      mr.iid,
    );
    hasFailedPipeline = pipelineStatus === 'failed';
  }

  const repoMatch = mr.web_url.match(/\/([^/]+)\/-\/merge_requests/);
  const repoName = repoMatch ? repoMatch[1] : 'unknown';

  return {
    id: mr.id,
    iid: mr.iid,
    repo: repoName,
    url: mr.web_url,
    title: mr.title,
    state: mr.state,
    has_conflicts: Boolean(source.has_conflicts),
    has_open_review: hasOpenReview,
    is_draft: Boolean(source.draft) || mr.title.toLowerCase().startsWith('draft:'),
    has_failed_pipeline: hasFailedPipeline,
  };
}

export async function fetchAndProcessTickets(
  redmineUrl: string,
  redmineApiKey: string,
  gitlabUrl: string,
  gitlabToken: string,
  onProgress?: (progress: number) => void
): Promise<ProcessedTicket[]> {
  const [gitlabUser, resolvedTickets] = await Promise.all([
    getGitlabUser(gitlabUrl, gitlabToken),
    redmineUrl && redmineApiKey
      ? getResolvedTickets(redmineUrl, redmineApiKey).catch(() => [])
      : Promise.resolve([]),
  ]);
  const userMRs = await getUserMRs(gitlabUrl, gitlabToken, gitlabUser.id);

  const ticketIdMap = new Map<number, GitlabMR[]>();
  const unticketedMRs: GitlabMR[] = [];

  for (const mr of userMRs) {
    const ticketId = extractTicketId(mr.title);
    if (ticketId !== null) {
      const existing = ticketIdMap.get(ticketId) || [];
      existing.push(mr);
      ticketIdMap.set(ticketId, existing);
    } else {
      unticketedMRs.push(mr);
    }
  }

  for (const resolved of resolvedTickets) {
    if (!ticketIdMap.has(resolved.id)) {
      ticketIdMap.set(resolved.id, []);
    }
  }

  if (userMRs.length === 0 && ticketIdMap.size === 0) {
    onProgress?.(100);
    return [];
  }

  const uniqueTicketIds = Array.from(ticketIdMap.keys());
  const totalSteps = uniqueTicketIds.length + unticketedMRs.length;
  let completedSteps = 0;

  const updateProgress = () => {
    completedSteps++;
    if (totalSteps > 0) {
      onProgress?.(Math.round((completedSteps / totalSteps) * 100));
    }
  };

  const results: ProcessedTicket[] = [];

  // Fetch ticket details & any sibling MRs across repos for each ticket
  await Promise.all(
    uniqueTicketIds.map(async (ticketId) => {
      try {
        const [matchingMRs, redmineIssue] = await Promise.all([
          searchGitlabMRs(gitlabUrl, gitlabToken, ticketId).catch(() => []),
          redmineUrl && redmineApiKey
            ? getRedmineIssue(redmineUrl, redmineApiKey, ticketId).catch(() => null)
            : Promise.resolve(null),
        ]);

        const mrMap = new Map<string, GitlabMR>();
        for (const mr of ticketIdMap.get(ticketId) || []) {
          mrMap.set(mr.web_url, mr);
        }
        for (const mr of matchingMRs) {
          mrMap.set(mr.web_url, mr);
        }

        const allMRs = Array.from(mrMap.values());
        if (allMRs.length === 0) {
          return;
        }

        const processedMRs = await Promise.all(
          allMRs.map((mr) => processMR(gitlabUrl, gitlabToken, mr, gitlabUser.id)),
        );

        if (redmineIssue) {
          results.push({
            id: ticketId,
            title: redmineIssue.subject,
            status: redmineIssue.status?.name,
            url: `${redmineUrl.replace(/\/$/, '')}/issues/${ticketId}`,
            mrs: processedMRs,
          });
        } else {
          results.push({
            id: null,
            title: 'No ticket',
            mrs: processedMRs,
          });
        }
      } catch (err) {
        console.error(`Failed to process ticket ${ticketId}:`, err);
      } finally {
        updateProgress();
      }
    }),
  );

  // Process unticketed MRs
  await Promise.all(
    unticketedMRs.map(async (mr) => {
      try {
        const processed = await processMR(gitlabUrl, gitlabToken, mr, gitlabUser.id);
        results.push({
          id: null,
          title: 'No ticket',
          mrs: [processed],
        });
      } catch (err) {
        console.error('Failed to process unticketed MR:', err);
      } finally {
        updateProgress();
      }
    }),
  );

  onProgress?.(100);

  return results.sort((a, b) => {
    if (a.id !== null && b.id !== null) return b.id - a.id;
    if (a.id !== null) return -1;
    if (b.id !== null) return 1;
    return 0;
  });
}

