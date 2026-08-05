import {
  getResolvedTickets,
  getGitlabUser,
  searchGitlabMRs,
  getGitlabMR,
  getMRLatestPipelineStatus,
  checkMRDiscussions,
  getOtherUserMRs,
  type GitlabMR,
} from './api';
import { PROBLEM_RULES } from './ticketSyncRules';
import type { ProcessedTicket, ProcessedMR, TicketEvaluation, TicketGroup } from '../sidepanel/domains/ticket-sync/types/index';

export { ticketStateKey } from './ticketSyncRules';

export const GROUP_CONFIG: { key: TicketEvaluation; label: string; description?: string }[] = [
  { key: 'ready', label: 'Ready to Test', description: 'Tickets are set as Resolved and MRs are merged' },
  { key: 'conflicts', label: 'Has Conflicts' },
  { key: 'test_failed', label: 'Test Failed', description: 'Has at least one failed pipeline' },
  { key: 'review', label: 'Has Open Review' },
  { key: 'open', label: 'Open to Merge', description: 'Tickets are set as Resolved' },
  { key: 'draft', label: 'Draft MR' },
  { key: 'others', label: 'Others' },
];

/**
 * Evaluate a ticket into one or more groups.
 * Problem states stack (conflicts / test_failed / review).
 * Terminal / exclusive states (ready, draft, open, others) stay single-group.
 */
export function evaluateTicket(
  mrs: ProcessedMR[],
  isResolved: boolean = true,
): { evaluations: TicketEvaluation[] } {
  if (mrs.length === 0) {
    return { evaluations: [isResolved ? 'open' : 'others'] };
  }

  if (mrs.every((mr) => mr.state === 'merged')) {
    return { evaluations: [isResolved ? 'ready' : 'others'] };
  }

  if (mrs.some((mr) => mr.is_draft)) {
    return { evaluations: ['draft'] };
  }

  const evaluations: TicketEvaluation[] = [];
  for (const rule of PROBLEM_RULES) {
    if (mrs.some((mr) => mr[rule.flag])) {
      evaluations.push(rule.evaluation);
    }
  }

  if (evaluations.length === 0) {
    return { evaluations: [isResolved ? 'open' : 'others'] };
  }

  return { evaluations };
}

async function processMR(
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
    iid: mr.iid,
    repo: repoName,
    url: mr.web_url,
    state: mr.state,
    has_conflicts: source.has_conflicts || false,
    has_open_review: hasOpenReview,
    is_draft: Boolean(source.draft) || mr.title.toLowerCase().startsWith('draft:'),
    has_failed_pipeline: hasFailedPipeline,
  };
}

function attachProcessedMR(
  processedTickets: ProcessedTicket[],
  resolvedTicketIds: Set<number>,
  redmineUrl: string,
  mr: GitlabMR,
  processedMR: ProcessedMR,
): void {
  let ticketId = -mr.id || -(Math.random() * 100000);
  let ticketUrl = mr.web_url;
  let ticketTitle = mr.title;

  const titleMatch = mr.title.match(/\[?#(\d+)\]?/);
  if (titleMatch && titleMatch[1]) {
    ticketId = parseInt(titleMatch[1], 10);
    ticketUrl = `${redmineUrl.replace(/\/$/, '')}/issues/${ticketId}`;
    ticketTitle = mr.title.replace(titleMatch[0], '').trim().replace(/^-/, '').trim();
  }

  const existingTicket = processedTickets.find((t) => t.id === ticketId);
  if (existingTicket) {
    existingTicket.mrs.push(processedMR);
    const { evaluations } = evaluateTicket(existingTicket.mrs, resolvedTicketIds.has(ticketId));
    existingTicket.evaluations = evaluations;
    return;
  }

  const { evaluations } = evaluateTicket([processedMR], false);
  processedTickets.push({
    id: ticketId,
    title: ticketTitle,
    url: ticketUrl,
    mrs: [processedMR],
    evaluations,
  });
}

export async function fetchAndProcessTickets(
  redmineUrl: string,
  redmineApiKey: string,
  gitlabUrl: string,
  gitlabToken: string,
  onProgress?: (progress: number) => void
): Promise<TicketGroup[]> {
  const [tickets, gitlabUser] = await Promise.all([
    getResolvedTickets(redmineUrl, redmineApiKey),
    getGitlabUser(gitlabUrl, gitlabToken),
  ]);

  const processedTickets: ProcessedTicket[] = [];
  const resolvedTicketIds = new Set(tickets.map((t) => t.id));

  if (tickets.length > 0) {
    let processedCount = 0;
    const chunkSize = 5;

    for (let i = 0; i < tickets.length; i += chunkSize) {
      const chunk = tickets.slice(i, i + chunkSize);

      await Promise.all(chunk.map(async (ticket) => {
        try {
          const mrs = await searchGitlabMRs(gitlabUrl, gitlabToken, ticket.id);
          if (mrs.length === 0) {
            return;
          }

          const processedMRs: ProcessedMR[] = await Promise.all(
            mrs.map((mr) => processMR(gitlabUrl, gitlabToken, mr, gitlabUser.id)),
          );

          const { evaluations } = evaluateTicket(processedMRs, true);
          processedTickets.push({
            id: ticket.id,
            title: ticket.title,
            url: ticket.url,
            mrs: processedMRs,
            evaluations,
          });
        } catch (err) {
          console.error(`Failed to process ticket ${ticket.id}:`, err);
        } finally {
          processedCount++;
          onProgress?.(Math.round((processedCount / tickets.length) * 100));
        }
      }));
    }
  } else {
    onProgress?.(100);
  }

  // Other open MRs (authored/assigned) not already tied to a resolved ticket.
  try {
    const otherMRs = await getOtherUserMRs(gitlabUrl, gitlabToken, gitlabUser.id);
    const trackedUrls = new Set<string>();

    processedTickets.forEach((t) => {
      t.mrs.forEach((mr) => trackedUrls.add(mr.url));
    });

    const untrackedMRs = otherMRs.filter((mr) => !trackedUrls.has(mr.web_url));

    // Enrich in parallel; attach serially so same-ticket merges stay race-free.
    const processed = await Promise.all(
      untrackedMRs.map((mr) => processMR(gitlabUrl, gitlabToken, mr, gitlabUser.id)),
    );

    for (let i = 0; i < untrackedMRs.length; i++) {
      attachProcessedMR(
        processedTickets,
        resolvedTicketIds,
        redmineUrl,
        untrackedMRs[i],
        processed[i],
      );
    }
  } catch (err) {
    console.error('Failed to fetch other MRs:', err);
  }

  return GROUP_CONFIG
    .map((config) => ({
      ...config,
      tickets: processedTickets.filter((t) => t.evaluations.includes(config.key)),
    }))
    .filter((g) => g.tickets.length > 0);
}
