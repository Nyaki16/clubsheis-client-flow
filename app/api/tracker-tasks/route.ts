import { NextRequest, NextResponse } from 'next/server'
import {
  createTrackerAdminClient,
  encodeTaskNotes,
  msToDate,
  TRACKER_TASK_STATUSES,
  type TrackerTaskStatus,
} from '@/lib/tracker'

type SubtaskInput = {
  name: string
  description?: string
  role?: string
  assigneeId?: string | null
  dueDateMs?: number | null
}

type TaskInput = {
  name: string
  description?: string
  role?: string
  tag?: string
  status?: TrackerTaskStatus
  assigneeId?: string | null
  dueDateMs?: number | null
  subtasks?: SubtaskInput[]
}

// GET handles three modes:
//   ?members=true              → list of team profiles (for assignee dropdowns)
//   ?jobId=<id>                → flat list of tasks on a job
//   (no params)                → 400
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const tracker = createTrackerAdminClient()

    if (searchParams.get('members') === 'true') {
      const { data, error } = await tracker
        .from('profiles')
        .select('id, name, email')
        .order('name', { ascending: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ members: data || [] })
    }

    const jobId = searchParams.get('jobId')
    if (jobId) {
      const { data, error } = await tracker
        .from('tasks')
        .select('id, job_id, title, notes, status, assignee_id, due_date, created_at, updated_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true })
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      return NextResponse.json({ tasks: data || [] })
    }

    return NextResponse.json({ error: 'jobId or members=true is required' }, { status: 400 })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/tracker-tasks  body: { jobId, tasks: TaskInput[] }
//   Flattens subtasks — each becomes its own row on the same job with notes
//   meta { role, tag, parent } so it can be regrouped in the UI later.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { jobId?: string; tasks?: TaskInput[] }
    const { jobId, tasks } = body
    if (!jobId || !tasks?.length) {
      return NextResponse.json({ error: 'jobId and tasks[] are required' }, { status: 400 })
    }

    const tracker = createTrackerAdminClient()
    const rows: {
      job_id: string
      title: string
      notes: string
      status: TrackerTaskStatus
      assignee_id: string | null
      due_date: string | null
    }[] = []

    for (const t of tasks) {
      const status: TrackerTaskStatus = TRACKER_TASK_STATUSES.includes(t.status as TrackerTaskStatus)
        ? (t.status as TrackerTaskStatus)
        : 'planning'

      rows.push({
        job_id: jobId,
        title: t.name,
        notes: encodeTaskNotes({
          role: t.role,
          tag: t.tag,
          description: t.description || '',
        }),
        status,
        assignee_id: t.assigneeId ?? null,
        due_date: msToDate(t.dueDateMs ?? null),
      })

      for (const sub of t.subtasks || []) {
        rows.push({
          job_id: jobId,
          title: `${t.name} — ${sub.name}`,
          notes: encodeTaskNotes({
            role: sub.role || t.role,
            tag: t.tag,
            parent: t.name,
            description: sub.description || '',
          }),
          status: 'planning',
          assignee_id: sub.assigneeId ?? t.assigneeId ?? null,
          due_date: msToDate(sub.dueDateMs ?? t.dueDateMs ?? null),
        })
      }
    }

    const { data, error } = await tracker
      .from('tasks')
      .insert(rows)
      .select('id, title, notes')

    if (error) {
      return NextResponse.json({ error: `Failed to create tasks: ${error.message}` }, { status: 500 })
    }

    const created = (data || []).map((d) => ({ id: d.id, name: d.title }))
    return NextResponse.json({ created, total: created.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// PATCH /api/tracker-tasks  body: { id, status?, assignee_id?, due_date? }
export async function PATCH(req: NextRequest) {
  try {
    const { id, status, assignee_id, due_date } = (await req.json()) as {
      id?: string
      status?: TrackerTaskStatus
      assignee_id?: string | null
      due_date?: string | null
    }
    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 })
    }
    const payload: Record<string, unknown> = {}
    if (status !== undefined) {
      if (!TRACKER_TASK_STATUSES.includes(status)) {
        return NextResponse.json({ error: 'invalid status' }, { status: 400 })
      }
      payload.status = status
    }
    if (assignee_id !== undefined) payload.assignee_id = assignee_id
    if (due_date !== undefined) payload.due_date = due_date
    if (Object.keys(payload).length === 0) {
      return NextResponse.json({ success: true })
    }

    const tracker = createTrackerAdminClient()
    const { error } = await tracker.from('tasks').update(payload).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/tracker-tasks?taskId=<id>
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const taskId = searchParams.get('taskId')
    if (!taskId) {
      return NextResponse.json({ error: 'taskId is required' }, { status: 400 })
    }

    const tracker = createTrackerAdminClient()
    const { error } = await tracker.from('tasks').delete().eq('id', taskId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
