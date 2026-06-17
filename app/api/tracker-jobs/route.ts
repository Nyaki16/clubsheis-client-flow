import { NextRequest, NextResponse } from 'next/server'
import { createTrackerAdminClient } from '@/lib/tracker'

// GET /api/tracker-jobs?clientId=<tracker-client-id>
//   → returns the tracker client and its jobs.
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const clientId = searchParams.get('clientId')
    if (!clientId) {
      return NextResponse.json({ error: 'clientId is required' }, { status: 400 })
    }

    const tracker = createTrackerAdminClient()

    const [{ data: client, error: clientErr }, { data: jobs, error: jobsErr }] = await Promise.all([
      tracker.from('clients').select('id, name, color').eq('id', clientId).maybeSingle(),
      tracker
        .from('jobs')
        .select('id, name, stage, due_date, created_at')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false }),
    ])

    if (clientErr) {
      return NextResponse.json({ error: clientErr.message }, { status: 500 })
    }
    if (jobsErr) {
      return NextResponse.json({ error: jobsErr.message }, { status: 500 })
    }

    return NextResponse.json({ client, jobs: jobs || [] })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// POST /api/tracker-jobs  body: { clientId, name, dueDate? }
//   → creates a job and returns it.
export async function POST(req: NextRequest) {
  try {
    const { clientId, name, dueDate } = (await req.json()) as {
      clientId?: string
      name?: string
      dueDate?: string | null
    }
    if (!clientId || !name) {
      return NextResponse.json({ error: 'clientId and name are required' }, { status: 400 })
    }

    const tracker = createTrackerAdminClient()
    const { data, error } = await tracker
      .from('jobs')
      .insert({
        client_id: clientId,
        name,
        due_date: dueDate || null,
        stage: 'briefing',
      })
      .select('id, name, stage, due_date, created_at')
      .single()

    if (error || !data) {
      return NextResponse.json(
        { error: `Failed to create job: ${error?.message ?? 'unknown error'}` },
        { status: 500 }
      )
    }

    return NextResponse.json({ job: data })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

// DELETE /api/tracker-jobs?jobId=<id>
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const jobId = searchParams.get('jobId')
    if (!jobId) {
      return NextResponse.json({ error: 'jobId is required' }, { status: 400 })
    }

    const tracker = createTrackerAdminClient()
    const { error } = await tracker.from('jobs').delete().eq('id', jobId)
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
