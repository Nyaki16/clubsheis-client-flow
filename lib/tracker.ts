import { createClient } from '@supabase/supabase-js'

// Service-role client for the ClubSheIs Tracker Supabase project.
// Use ONLY from server routes — bypasses RLS, never expose to the browser.
export function createTrackerAdminClient() {
  const url = process.env.TRACKER_SUPABASE_URL
  const key = process.env.TRACKER_SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error(
      'Tracker not configured. Add TRACKER_SUPABASE_URL and TRACKER_SUPABASE_SERVICE_ROLE_KEY.'
    )
  }
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

// Status taxonomy mirrored from the tracker (lib/types.ts there).
export const TRACKER_TASK_STATUSES = [
  'planning',
  'in_progress',
  'in_review',
  'awaiting_client',
  'published',
  'closed_out',
] as const
export type TrackerTaskStatus = (typeof TRACKER_TASK_STATUSES)[number]

export const TRACKER_CLOSED_STATUSES: TrackerTaskStatus[] = ['published', 'closed_out']

export const TRACKER_STATUS_META: Record<TrackerTaskStatus, { label: string; color: string }> = {
  planning: { label: 'Planning', color: '#94a3b8' },
  in_progress: { label: 'In progress', color: '#f59e0b' },
  in_review: { label: 'In review', color: '#8b5cf6' },
  awaiting_client: { label: 'Awaiting client', color: '#ec4899' },
  published: { label: 'Published', color: '#10b981' },
  closed_out: { label: 'Closed out', color: '#22c55e' },
}

// Pack role + funnel-stage tag + parent task title into the tracker's `notes`
// field via a JSON header line. Tracker UI sees the meta header as the first
// line of notes; client-flow parses it out for display.
export type TaskMeta = {
  role?: string
  tag?: string
  parent?: string
  description?: string
}

const META_PREFIX = '__meta:'

export function encodeTaskNotes(meta: TaskMeta): string {
  const { description = '', ...rest } = meta
  const hasMeta = Object.values(rest).some((v) => v !== undefined && v !== '')
  if (!hasMeta) return description
  return `${META_PREFIX}${JSON.stringify(rest)}\n${description}`.trimEnd()
}

export function decodeTaskNotes(notes: string): TaskMeta {
  if (!notes) return {}
  if (!notes.startsWith(META_PREFIX)) return { description: notes }
  const nl = notes.indexOf('\n')
  const head = nl === -1 ? notes.slice(META_PREFIX.length) : notes.slice(META_PREFIX.length, nl)
  const description = nl === -1 ? '' : notes.slice(nl + 1)
  try {
    const parsed = JSON.parse(head) as Omit<TaskMeta, 'description'>
    return { ...parsed, description }
  } catch {
    return { description: notes }
  }
}

// Convert a unix-ms timestamp to a tracker DATE (YYYY-MM-DD) string.
export function msToDate(ms: number | null | undefined): string | null {
  if (!ms) return null
  const d = new Date(ms)
  if (isNaN(d.getTime())) return null
  return d.toISOString().slice(0, 10)
}
