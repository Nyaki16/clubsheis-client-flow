import { NextRequest } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import PDFDocument from 'pdfkit'

export const runtime = 'nodejs'
// pdfkit pulls Helvetica from disk lazily; force the function into a clean
// runtime that includes a writable /tmp and the bundled fonts.
export const dynamic = 'force-dynamic'
export const maxDuration = 30

// Brand colours — match the on-screen brief.
const ACCENT = '#0F766E'      // teal, the brand-voice "creative" colour
const INK = '#1C1917'         // near-black body text
const MUTED = '#57534E'       // muted secondary text
const BG_DARK = '#1C1917'     // dark hero panel

type Section = { title: string; body: string[] }

/**
 * Split the brief markdown into sections by the "## SECTION N — TITLE" headings.
 * Falls back to a single section if no SECTION markers are found.
 */
function parseSections(brief: string): Section[] {
  const lines = brief.split('\n')
  const sections: Section[] = []
  let current: Section | null = null

  for (const line of lines) {
    // Section heading: "## SECTION 1 — THE BUSINESS PROBLEM"
    const sectionMatch = line.match(/^##\s+SECTION\s+\d+\s*[—\-:]\s*(.+)$/i)
    if (sectionMatch) {
      if (current) sections.push(current)
      current = { title: sectionMatch[1].trim(), body: [] }
      continue
    }
    if (!current) {
      // Pre-amble before first section — accumulate into a synthetic section
      current = { title: '', body: [] }
    }
    current.body.push(line)
  }
  if (current) sections.push(current)

  // Drop empty sections (e.g. only blank lines)
  return sections.filter(s => s.title || s.body.some(l => l.trim()))
}

/** Render a single brief section onto its own PDF page. */
function renderSection(doc: PDFKit.PDFDocument, section: Section, pageNumber: number) {
  const pageWidth = doc.page.width
  const margin = 56

  // Accent rule top-left.
  doc.save()
    .rect(margin, margin, 48, 3)
    .fill(ACCENT)
    .restore()

  // Page number, top-right.
  doc.fillColor(MUTED).fontSize(10).font('Helvetica')
    .text(`${String(pageNumber).padStart(2, '0')}`, margin, margin - 4, {
      width: pageWidth - margin * 2, align: 'right',
    })

  // Section title.
  doc.moveDown(2)
  doc.fillColor(INK).fontSize(28).font('Helvetica-Bold')
    .text(section.title || 'Paid Media Creative Brief', margin, undefined, { width: pageWidth - margin * 2 })

  doc.moveDown(1)

  // Body — preserve sub-headings and bullets, drop markdown noise.
  doc.fontSize(11).font('Helvetica').fillColor(INK)
  const bodyText = section.body.join('\n').trim()

  for (const rawLine of bodyText.split('\n')) {
    const line = rawLine.trimEnd()

    // Skip pure separator lines.
    if (/^[-=_]{3,}$/.test(line)) continue

    // Sub-heading "### Foo"
    const subHeading = line.match(/^###\s+(.+)$/)
    if (subHeading) {
      doc.moveDown(0.6)
      doc.fillColor(ACCENT).fontSize(13).font('Helvetica-Bold')
        .text(subHeading[1].trim(), { width: pageWidth - margin * 2 })
      doc.moveDown(0.3)
      doc.fontSize(11).font('Helvetica').fillColor(INK)
      continue
    }

    // Bullet "- foo" or "* foo"
    const bullet = line.match(/^[-*]\s+(.+)$/)
    if (bullet) {
      doc.fillColor(INK).fontSize(11).font('Helvetica')
        .text(`•  ${stripMd(bullet[1])}`, { width: pageWidth - margin * 2, indent: 12 })
      continue
    }

    // Blank line → paragraph break
    if (!line) {
      doc.moveDown(0.5)
      continue
    }

    // Default body paragraph
    doc.fillColor(INK).fontSize(11).font('Helvetica')
      .text(stripMd(line), { width: pageWidth - margin * 2, align: 'left' })
  }

  // Footer brand line.
  const footerY = doc.page.height - margin
  doc.fontSize(8).fillColor(MUTED).font('Helvetica')
    .text('ClubSheIs · Paid Media Creative Brief', margin, footerY - 12, {
      width: pageWidth - margin * 2, align: 'left',
    })
}

/** Strip the most common markdown emphasis markers from a line. */
function stripMd(s: string): string {
  return s
    .replace(/\*\*(.+?)\*\*/g, '$1')   // bold
    .replace(/__(.+?)__/g, '$1')       // bold (alt)
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '$1')  // italic
    .replace(/`([^`]+)`/g, '$1')       // inline code
    .trim()
}

/** Build the title page (cover). */
function renderCover(doc: PDFKit.PDFDocument, clientName: string, brandName: string | null) {
  const w = doc.page.width
  const h = doc.page.height

  // Dark hero panel — top 60% of the page.
  doc.save()
    .rect(0, 0, w, h * 0.62)
    .fill(BG_DARK)
    .restore()

  // Accent ribbon.
  doc.save()
    .rect(56, h * 0.58 - 4, 64, 4)
    .fill(ACCENT)
    .restore()

  // Eyebrow
  doc.fillColor('#FFFFFF').fontSize(11).font('Helvetica')
    .text('PAID MEDIA CREATIVE BRIEF', 56, 80, { characterSpacing: 4 })

  // Big title
  doc.fillColor('#FFFFFF').fontSize(48).font('Helvetica-Bold')
    .text(brandName || clientName, 56, 140, { width: w - 112 })

  // Subtitle
  doc.fillColor('#A8A29E').fontSize(14).font('Helvetica')
    .text(brandName ? `Prepared for ${clientName}` : 'Strategy synthesis', 56, undefined, { width: w - 112 })

  // Body intro on the light panel
  doc.fillColor(INK).fontSize(11).font('Helvetica')
    .text(
      'A nine-part synthesis of your business problem, audience research, ' +
      'and brand voice — built to guide the next round of creative tests. ' +
      'Every recommendation in this brief traces back to evidence in your research.',
      56, h * 0.66, { width: w - 112, lineGap: 4 },
    )

  // Footer brand
  doc.fontSize(8).fillColor(MUTED).font('Helvetica')
    .text('ClubSheIs', 56, h - 60, { width: w - 112, align: 'left' })
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  if (!clientId) return new Response('clientId required', { status: 400 })

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )

  // Pull the brief content and the client name in parallel.
  const [clientRes, briefRes] = await Promise.all([
    supabase.from('flow_clients').select('name, brand').eq('id', clientId).single(),
    supabase.from('flow_stage_data')
      .select('field_value')
      .eq('client_id', clientId)
      .eq('stage_key', 'strategy-brief')
      .eq('field_key', 'brief_text')
      .maybeSingle(),
  ])

  if (clientRes.error || !clientRes.data) return new Response('Client not found', { status: 404 })
  const brief = briefRes.data?.field_value
  if (!brief) return new Response('Brief not generated yet for this client.', { status: 404 })

  const sections = parseSections(brief)

  // Build the PDF.
  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 56, bottom: 56, left: 56, right: 56 },
    autoFirstPage: false,
    info: {
      Title: `${clientRes.data.brand || clientRes.data.name} — Paid Media Creative Brief`,
      Author: 'ClubSheIs',
    },
  })

  // Cover page.
  doc.addPage()
  renderCover(doc, clientRes.data.name, clientRes.data.brand)

  // Section pages.
  sections.forEach((section, i) => {
    doc.addPage()
    renderSection(doc, section, i + 1)
  })

  // Stream into a buffer (Next.js wants a Response body).
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
      // public + immutable-ish so Canva can re-fetch if needed; brief content
      // changes via Supabase, so let it be revalidated each generation.
      'Cache-Control': 'public, max-age=60, must-revalidate',
      'Content-Disposition': `inline; filename="${clientRes.data.name}_CreativeStrategyBrief.pdf"`,
    },
  })
}
