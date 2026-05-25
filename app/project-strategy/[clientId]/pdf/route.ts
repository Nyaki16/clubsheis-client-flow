import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Project Strategy uses the violet accent (matches the stage card colour).
const ACCENT = '#7C3AED'
const INK = '#1C1917'
const MUTED = '#57534E'
const BG_DARK = '#1C1917'

type Section = { title: string; body: string[] }

function parseSections(brief: string): Section[] {
  const lines = brief.split('\n')
  const sections: Section[] = []
  let current: Section | null = null

  for (const line of lines) {
    const sectionMatch = line.match(/^##\s+SECTION\s+\d+\s*[—\-:]\s*(.+)$/i)
    if (sectionMatch) {
      if (current) sections.push(current)
      current = { title: sectionMatch[1].trim(), body: [] }
      continue
    }
    if (!current) current = { title: '', body: [] }
    current.body.push(line)
  }
  if (current) sections.push(current)
  return sections.filter(s => s.title || s.body.some(l => l.trim()))
}

/**
 * Strip markdown emphasis markers. Replace each marker with a space then collapse
 * runs — the LLM frequently emits **bold** with no surrounding whitespace
 * ("word**bold**word"), which fuses to "wordboldword" if you just remove the markers.
 */
function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, ' $1 ')
    .replace(/__(.+?)__/g, ' $1 ')
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, ' $1 ')
    .replace(/`([^`]+)`/g, ' $1 ')
    .replace(/\s+([,.;:!?)\]])/g, '$1')
    .replace(/([(\[])\s+/g, '$1')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function renderSection(doc: PDFKit.PDFDocument, section: Section, pageNumber: number) {
  const pageWidth = doc.page.width
  const margin = 64
  const contentWidth = Math.min(pageWidth - margin * 2, 660)

  doc.save().rect(margin, margin, 48, 3).fill(ACCENT).restore()

  doc.fillColor(MUTED).fontSize(10).font('Helvetica')
    .text(`${String(pageNumber).padStart(2, '0')}`, margin, margin - 4, {
      width: pageWidth - margin * 2, align: 'right',
    })

  doc.moveDown(2)
  doc.fillColor(INK).fontSize(32).font('Helvetica-Bold')
    .text(section.title || 'Project Strategy', margin, undefined, { width: contentWidth })

  doc.moveDown(1)
  doc.fontSize(12).font('Helvetica').fillColor(INK)
  const bodyText = section.body.join('\n').trim()

  for (const rawLine of bodyText.split('\n')) {
    const line = rawLine.trimEnd()

    if (/^[-=_]{3,}$/.test(line)) continue

    const subHeading = line.match(/^###\s+(.+)$/)
    if (subHeading) {
      doc.moveDown(0.6)
      doc.fillColor(ACCENT).fontSize(14).font('Helvetica-Bold')
        .text(subHeading[1].trim(), { width: contentWidth })
      doc.moveDown(0.3)
      doc.fontSize(12).font('Helvetica').fillColor(INK)
      continue
    }

    const bullet = line.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      doc.fillColor(INK).fontSize(12).font('Helvetica')
        .text(`•  ${stripMd(bullet[1])}`, { width: contentWidth, indent: 12 })
      continue
    }

    if (!line) {
      doc.moveDown(0.5)
      continue
    }

    doc.fillColor(INK).fontSize(12).font('Helvetica')
      .text(stripMd(line), { width: contentWidth, align: 'left' })
  }

  const footerY = doc.page.height - margin
  doc.fontSize(8).fillColor(MUTED).font('Helvetica')
    .text('ClubSheIs · Project Strategy', margin, footerY - 12, {
      width: pageWidth - margin * 2, align: 'left',
    })
}

function renderCover(doc: PDFKit.PDFDocument, clientName: string, brandName: string | null) {
  const w = doc.page.width
  const h = doc.page.height

  doc.save().rect(0, 0, w, h).fill(BG_DARK).restore()
  doc.save().rect(64, h / 2 - 80, 72, 4).fill(ACCENT).restore()

  doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica')
    .text('PROJECT STRATEGY', 64, 64, { characterSpacing: 4 })

  doc.fillColor('#FFFFFF').fontSize(56).font('Helvetica-Bold')
    .text(brandName || clientName, 64, h / 2 - 50, { width: w - 128 })

  doc.fillColor('#A8A29E').fontSize(16).font('Helvetica')
    .text(brandName ? `Prepared for ${clientName}` : 'Strategic kickoff', 64, undefined, { width: w - 128 })

  doc.fillColor('#A8A29E').fontSize(11).font('Helvetica')
    .text(
      'Your full project strategy in one document — who we serve, what we discovered, ' +
      'how we\'ll speak, and what we\'re building together.',
      64, h - 140, { width: 540, lineGap: 4 },
    )

  doc.fontSize(8).fillColor('#A8A29E').font('Helvetica')
    .text('ClubSheIs', 64, h - 48, { align: 'left' })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  if (!clientId) return new Response('clientId required', { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  const [clientRes, briefRes] = await Promise.all([
    supabase.from('flow_clients').select('name, brand').eq('id', clientId).single(),
    supabase.from('flow_stage_data')
      .select('field_value')
      .eq('client_id', clientId)
      .eq('stage_key', 'project-strategy')
      .eq('field_key', 'brief_text')
      .maybeSingle(),
  ])

  if (clientRes.error || !clientRes.data) return new Response('Client not found', { status: 404 })
  const brief = briefRes.data?.field_value
  if (!brief) return new Response('Project Strategy not generated yet for this client.', { status: 404 })

  const sections = parseSections(brief)

  const doc = new PDFDocument({
    size: 'A4',
    layout: 'landscape',
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
    autoFirstPage: false,
    info: {
      Title: `${clientRes.data.brand || clientRes.data.name} — Project Strategy`,
      Author: 'ClubSheIs',
    },
  })

  doc.addPage()
  renderCover(doc, clientRes.data.name, clientRes.data.brand)

  sections.forEach((section, i) => {
    doc.addPage()
    renderSection(doc, section, i + 1)
  })

  const chunks: Buffer[] = []
  doc.on('data', (c: Buffer) => chunks.push(c))
  const done = new Promise<void>(resolve => doc.on('end', () => resolve()))
  doc.end()
  await done
  const pdfBuffer = Buffer.concat(chunks)

  return new Response(new Uint8Array(pdfBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Cache-Control': 'public, max-age=60, must-revalidate',
      'Content-Disposition': `inline; filename="${clientRes.data.name}_ProjectStrategy.pdf"`,
    },
  })
}
