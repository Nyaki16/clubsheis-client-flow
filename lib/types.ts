export interface Client {
  id: string
  name: string
  brand: string
  email: string
  phone: string
  website: string
  socials: string
  needs: string
  budget_range: string
  lead_status: string
  package: string
  scope_details: string
  pricing: string
  payment_terms: string
  start_date: string
  contract_type: string
  proposal_status: string
  current_stage: string
  created_at: string
  updated_at: string
}

export interface StageCompletion {
  id: string
  client_id: string
  stage_key: string
  substep_index: number
  completed: boolean
  completed_by: string
  completed_at: string | null
  notes: string
}

export interface StageFieldValue {
  id: string
  client_id: string
  stage_key: string
  field_key: string
  field_value: string
  updated_at: string
}

export interface SubStep {
  label: string
  description: string
}

export interface DataField {
  key: string
  label: string
  placeholder: string
  type: 'text' | 'select' | 'date' | 'textarea'
  options?: string[]
}

export interface ConditionalRule {
  condition: string
  result: string
}

export interface StageDefinition {
  key: string
  num: string
  name: string
  summary: string
  color: string
  colorSoft: string
  triggerLabel: string
  triggerColor: string
  substeps: SubStep[]
  dataFields: DataField[]
  conditionalLogic: ConditionalRule[]
  nextActionPrompt: string
  conditional?: boolean
  conditionPackages?: string[]
  parallelTracks?: {
    name: string
    icon: string
    steps: string[]
  }[]
}
