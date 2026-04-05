import { supabase } from './supabase'
import { Client, StageCompletion, StageFieldValue } from './types'

// ── Clients ──

export async function getClients(): Promise<Client[]> {
  const { data, error } = await supabase
    .from('flow_clients')
    .select('*')
    .order('created_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function getClient(id: string): Promise<Client | null> {
  const { data, error } = await supabase
    .from('flow_clients')
    .select('*')
    .eq('id', id)
    .single()
  if (error) return null
  return data
}

export async function createClient(fields: Partial<Client>): Promise<Client> {
  const { data, error } = await supabase
    .from('flow_clients')
    .insert([{ ...fields, current_stage: 'discovery' }])
    .select()
    .single()
  if (error) throw error
  return data
}

export async function updateClient(id: string, fields: Partial<Client>): Promise<void> {
  const { error } = await supabase
    .from('flow_clients')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id)
  if (error) throw error
}

export async function deleteClient(id: string): Promise<void> {
  const { error } = await supabase
    .from('flow_clients')
    .delete()
    .eq('id', id)
  if (error) throw error
}

// ── Stage Completions ──

export async function getCompletions(clientId: string): Promise<StageCompletion[]> {
  const { data, error } = await supabase
    .from('flow_stage_completions')
    .select('*')
    .eq('client_id', clientId)
  if (error) throw error
  return data || []
}

export async function toggleSubstep(
  clientId: string,
  stageKey: string,
  substepIndex: number,
  completed: boolean,
  completedBy: string
): Promise<void> {
  const { error } = await supabase
    .from('flow_stage_completions')
    .upsert({
      client_id: clientId,
      stage_key: stageKey,
      substep_index: substepIndex,
      completed,
      completed_by: completedBy,
      completed_at: completed ? new Date().toISOString() : null,
    }, { onConflict: 'client_id,stage_key,substep_index' })
  if (error) throw error
}

// ── Stage Data ──

export async function getStageData(clientId: string): Promise<StageFieldValue[]> {
  const { data, error } = await supabase
    .from('flow_stage_data')
    .select('*')
    .eq('client_id', clientId)
  if (error) throw error
  return data || []
}

export async function saveStageField(
  clientId: string,
  stageKey: string,
  fieldKey: string,
  fieldValue: string
): Promise<void> {
  const { error } = await supabase
    .from('flow_stage_data')
    .upsert({
      client_id: clientId,
      stage_key: stageKey,
      field_key: fieldKey,
      field_value: fieldValue,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'client_id,stage_key,field_key' })
  if (error) throw error
}
