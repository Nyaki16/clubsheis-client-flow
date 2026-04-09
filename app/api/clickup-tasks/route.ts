import { NextRequest, NextResponse } from 'next/server'

const CLICKUP_BASE = 'https://api.clickup.com/api/v2'

// POST: Create tasks in a ClickUp list
export async function POST(req: NextRequest) {
  try {
    const clickupToken = process.env.CLICKUP_API_TOKEN
    if (!clickupToken) {
      return NextResponse.json({ error: 'ClickUp not configured. Add CLICKUP_API_TOKEN.' }, { status: 500 })
    }

    const body = await req.json()
    const { listId, tasks } = body as {
      listId: string
      tasks: {
        name: string
        description?: string
        assignees?: number[]
        tags?: string[]
        priority?: number // 1=urgent,2=high,3=normal,4=low
        due_date?: number // unix ms
        subtasks?: { name: string; description?: string; assignees?: number[] }[]
      }[]
    }

    if (!listId || !tasks?.length) {
      return NextResponse.json({ error: 'listId and tasks[] are required' }, { status: 400 })
    }

    const created: { id: string; name: string; url: string; subtasksCreated: number }[] = []

    for (const task of tasks) {
      // Create parent task
      const taskRes = await fetch(`${CLICKUP_BASE}/list/${listId}/task`, {
        method: 'POST',
        headers: {
          'Authorization': clickupToken,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: task.name,
          description: task.description || '',
          assignees: task.assignees || [],
          tags: task.tags || [],
          priority: task.priority || 3,
          due_date: task.due_date || undefined,
        }),
      })

      if (!taskRes.ok) {
        const err = await taskRes.text()
        return NextResponse.json({ error: `Failed to create task "${task.name}": ${err}` }, { status: taskRes.status })
      }

      const taskData = await taskRes.json()
      let subtasksCreated = 0

      // Create subtasks
      if (task.subtasks?.length) {
        for (const sub of task.subtasks) {
          const subRes = await fetch(`${CLICKUP_BASE}/list/${listId}/task`, {
            method: 'POST',
            headers: {
              'Authorization': clickupToken,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: sub.name,
              description: sub.description || '',
              parent: taskData.id,
              assignees: sub.assignees || [],
            }),
          })
          if (subRes.ok) subtasksCreated++
        }
      }

      created.push({
        id: taskData.id,
        name: taskData.name,
        url: taskData.url,
        subtasksCreated,
      })
    }

    return NextResponse.json({ created, total: created.length })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

export async function GET(req: NextRequest) {
  try {
    const clickupToken = process.env.CLICKUP_API_TOKEN
    if (!clickupToken) {
      return NextResponse.json({ error: 'ClickUp not configured. Add CLICKUP_API_TOKEN.' }, { status: 500 })
    }

    const { searchParams } = new URL(req.url)
    const listId = searchParams.get('listId')
    const folderId = searchParams.get('folderId')

    // If listId provided, fetch tasks from that list
    if (listId) {
      const res = await fetch(`${CLICKUP_BASE}/list/${listId}/task?include_closed=true&subtasks=true`, {
        headers: { 'Authorization': clickupToken },
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: `ClickUp API error: ${err}` }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ tasks: data.tasks || [] })
    }

    // If folderId provided, fetch lists in that folder
    if (folderId) {
      const res = await fetch(`${CLICKUP_BASE}/folder/${folderId}/list`, {
        headers: { 'Authorization': clickupToken },
      })
      if (!res.ok) {
        const err = await res.text()
        return NextResponse.json({ error: `ClickUp API error: ${err}` }, { status: res.status })
      }
      const data = await res.json()
      return NextResponse.json({ lists: data.lists || [] })
    }

    // Default: fetch workspace hierarchy for list selection
    const teamId = process.env.CLICKUP_TEAM_ID || '90121487936'
    const res = await fetch(`${CLICKUP_BASE}/team/${teamId}/space?archived=false`, {
      headers: { 'Authorization': clickupToken },
    })
    if (!res.ok) {
      const err = await res.text()
      return NextResponse.json({ error: `ClickUp API error: ${err}` }, { status: res.status })
    }
    const data = await res.json()

    // For each space, get folders and lists
    const spaces = []
    for (const space of data.spaces || []) {
      // Get folders
      const foldersRes = await fetch(`${CLICKUP_BASE}/space/${space.id}/folder`, {
        headers: { 'Authorization': clickupToken },
      })
      const foldersData = foldersRes.ok ? await foldersRes.json() : { folders: [] }

      // Get folderless lists
      const listsRes = await fetch(`${CLICKUP_BASE}/space/${space.id}/list`, {
        headers: { 'Authorization': clickupToken },
      })
      const listsData = listsRes.ok ? await listsRes.json() : { lists: [] }

      spaces.push({
        id: space.id,
        name: space.name,
        folders: (foldersData.folders || []).map((f: { id: string; name: string; lists: { id: string; name: string }[] }) => ({
          id: f.id,
          name: f.name,
          lists: (f.lists || []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })),
        })),
        lists: (listsData.lists || []).map((l: { id: string; name: string }) => ({ id: l.id, name: l.name })),
      })
    }

    return NextResponse.json({ spaces })
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
