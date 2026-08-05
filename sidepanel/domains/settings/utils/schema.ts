import { z } from 'zod'

export const settingsSchema = z.object({
  redmineUrl: z.string().min(1, 'API URL is required').url('Please enter a valid URL').startsWith('https://', 'URL must start with https://').transform(val => val.trim().replace(/\/$/, '')),
  redmineApiKey: z.string().min(1, 'API Key is required').transform(val => val.trim()),
  gitlabUrl: z.union([z.string().url('Please enter a valid URL').startsWith('https://', 'URL must start with https://'), z.literal('')]).transform(val => val.trim().replace(/\/$/, '')).default(''),
  gitlabToken: z.string().transform(val => val.trim()).default(''),
  badgeDisplayType: z.enum(['logged', 'remaining']),
  rankingDisplayType: z.enum(['logged', 'remaining']),
  badgeTimeScope: z.enum(['today', 'week', 'month']),
  hoursPerDay: z.number().min(1, 'Minimum 1 hour per day').max(24, 'Maximum 24 hours per day'),
  projectId: z.string().nullable(),
})
