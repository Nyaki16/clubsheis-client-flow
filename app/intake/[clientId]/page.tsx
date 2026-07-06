import IntakeForm from './IntakeForm'

export const dynamic = 'force-dynamic'

export default async function IntakePage({ params }: { params: Promise<{ clientId: string }> }) {
  const { clientId } = await params
  return <IntakeForm clientId={clientId} />
}
