import type { ProcessedTicket } from '../types/index'

export const MOCK_TICKETS: ProcessedTicket[] = [
  // 1. Ready to Test Group: Ticket is Resolved & all MRs are merged
  {
    id: 15830,
    title: 'Scalable offline syncing architecture — cache handling',
    url: 'https://redmine.example.com/issues/15830',
    status: 'Resolved',
    mrs: [
      {
        iid: 4120,
        repo: 'app-core',
        url: 'https://gitlab.example.com/team/app-core/-/merge_requests/4120',
        title: '[#15830] Core sync engine cache abstraction',
        state: 'merged',
        has_conflicts: false,
        has_open_review: false,
        is_draft: false,
        has_failed_pipeline: false,
      },
      {
        iid: 89,
        repo: 'sync-engine',
        url: 'https://gitlab.example.com/team/sync-engine/-/merge_requests/89',
        title: '[#15830] Optimize queue persistence',
        state: 'merged',
        has_conflicts: false,
        has_open_review: false,
        is_draft: false,
        has_failed_pipeline: false,
      },
      {
        iid: 2844,
        repo: 'mobile-app',
        url: 'https://gitlab.example.com/team/mobile-app/-/merge_requests/2844',
        title: '[#15830] Mobile offline storage layer',
        state: 'merged',
        has_conflicts: false,
        has_open_review: false,
        is_draft: false,
        has_failed_pipeline: false,
      },
    ],
  },

  // 2. Multi-Status MR: Single MR with all 3 problem flags (has review + test failed + conflict)
  {
    id: 15935,
    title: 'Refactor session token refresh middleware and auth gateway',
    url: 'https://redmine.example.com/issues/15935',
    status: 'Feedback',
    mrs: [
      {
        iid: 890,
        repo: 'auth-gateway',
        url: 'https://gitlab.example.com/team/auth-gateway/-/merge_requests/890',
        title: '[#15935] Multi-status MR with review, failed test, and conflict',
        state: 'opened',
        has_conflicts: true,
        has_open_review: true,
        is_draft: false,
        has_failed_pipeline: true,
      },
      {
        iid: 891,
        repo: 'auth-models',
        url: 'https://gitlab.example.com/team/auth-models/-/merge_requests/891',
        title: '[#15935] Token schema definitions',
        state: 'opened',
        has_conflicts: false,
        has_open_review: false,
        is_draft: false,
        has_failed_pipeline: false,
      },
    ],
  },

  // 3. Multi-Status MR: Dual flags (test failed + conflict) & (has review + test failed)
  {
    id: 15870,
    title: 'Improve data parsing performance for high-throughput queues',
    url: 'https://redmine.example.com/issues/15870',
    status: 'Developing',
    mrs: [
      {
        iid: 720,
        repo: 'background-worker',
        url: 'https://gitlab.example.com/team/background-worker/-/merge_requests/720',
        title: '[#15870] Dual status: conflict + test failed',
        state: 'opened',
        has_conflicts: true,
        has_open_review: false,
        is_draft: false,
        has_failed_pipeline: true,
      },
      {
        iid: 721,
        repo: 'background-models',
        url: 'https://gitlab.example.com/team/background-models/-/merge_requests/721',
        title: '[#15870] Dual status: has review + test failed',
        state: 'opened',
        has_conflicts: false,
        has_open_review: true,
        is_draft: false,
        has_failed_pipeline: true,
      },
    ],
  },

  // 4. Multi-Status MR: Dual flags (has review + conflict)
  {
    id: 15888,
    title: 'Fix pagination query and cache invalidation on user list',
    url: 'https://redmine.example.com/issues/15888',
    status: 'In Progress',
    mrs: [
      {
        iid: 1902,
        repo: 'api-core',
        url: 'https://gitlab.example.com/team/api-core/-/merge_requests/1902',
        title: '[#15888] Dual status: has review + conflict',
        state: 'opened',
        has_conflicts: true,
        has_open_review: true,
        is_draft: false,
        has_failed_pipeline: false,
      },
      {
        iid: 1903,
        repo: 'api-models',
        url: 'https://gitlab.example.com/team/api-models/-/merge_requests/1903',
        title: '[#15888] Add cursor pagination schema',
        state: 'opened',
        has_conflicts: false,
        has_open_review: false,
        is_draft: false,
        has_failed_pipeline: false,
      },
    ],
  },

  // 5. Draft MR
  {
    id: 15920,
    title: 'Add WebAuthn biometric passkey login support',
    url: 'https://redmine.example.com/issues/15920',
    status: 'New',
    mrs: [
      {
        iid: 512,
        repo: 'auth-service',
        url: 'https://gitlab.example.com/team/auth-service/-/merge_requests/512',
        title: 'Draft: [#15920] Passkey authenticator registration',
        state: 'opened',
        has_conflicts: false,
        has_open_review: false,
        is_draft: true,
        has_failed_pipeline: false,
      },
    ],
  },

  // 6. Open to Merge: Ticket is Resolved, but MRs are still opened
  {
    id: 15855,
    title: 'V2 Pipeline rewrite across services',
    url: 'https://redmine.example.com/issues/15855',
    status: 'Resolved',
    mrs: [
      {
        iid: 1201,
        repo: 'redlab-utils',
        url: 'https://gitlab.example.com/team/redlab-utils/-/merge_requests/1201',
        title: '[#15855] Standardize event dispatching',
        state: 'opened',
        has_conflicts: false,
        has_open_review: false,
        is_draft: false,
        has_failed_pipeline: false,
      },
      {
        iid: 2801,
        repo: 'mobile-app',
        url: 'https://gitlab.example.com/team/mobile-app/-/merge_requests/2801',
        title: '[#15855] Connect websocket notification stream',
        state: 'opened',
        has_conflicts: false,
        has_open_review: false,
        is_draft: false,
        has_failed_pipeline: false,
      },
    ],
  },

  // 7. Untracked MR (No Ticket) with multiple MRs
  {
    id: null,
    title: 'No ticket',
    mrs: [
      {
        iid: 88,
        repo: 'infra-deploy',
        url: 'https://gitlab.example.com/team/infra-deploy/-/merge_requests/88',
        title: 'Upgrade terraform helm provider to v2.14',
        state: 'opened',
        has_conflicts: false,
        has_open_review: false,
        is_draft: false,
        has_failed_pipeline: false,
      },
      {
        iid: 89,
        repo: 'infra-ci',
        url: 'https://gitlab.example.com/team/infra-ci/-/merge_requests/89',
        title: 'Fix runner image build pipeline',
        state: 'opened',
        has_conflicts: true,
        has_open_review: true,
        is_draft: false,
        has_failed_pipeline: false,
      },
    ],
  },
]
