import type { ProcessInfo } from './api.js';

export interface Contract {
  id: number;
  internal_uuid?: string;
  file_name: string;
  file_type?: string;
  created_at: string;
  extractions?: ContractExtractions;
  custom_extractions?: CustomExtraction[];
  score?: ResourceScore;
}

export interface CustomExtraction extends ContractExtractionIdentity {
  extractor_id: number;
  extractor_name: string | null;
  data: unknown;
}

export interface ContractCommitmentDeliverable {
  type: string;
  description: string;
  quantity: number;
  fulfilled: number;
  [key: string]: unknown;
}

export type ContractCitationStructure =
  | 'paragraph'
  | 'document_header'
  | 'document_footer'
  | 'table'
  | 'list_item'
  | 'schedule'
  | 'exhibit'
  | 'addendum'
  | 'other';

export interface ContractCitation {
  field: string | null;
  page: number | null;
  section_number: string | null;
  section_title: string | null;
  section_structure: ContractCitationStructure | null;
  citation: string | null;
}

export interface ContractExtractionIdentity {
  id: number;
  internal_uuid: string;
  created_at?: string;
  updated_at?: string;
  citations?: ContractCitation[];
}

export interface ContractCrmLink {
  id: number;
  internal_uuid: string;
}

export interface ContractEntity extends ContractExtractionIdentity {
  name?: string;
  legal_name?: string;
  trading_as?: string;
  email?: string;
  phone?: string;
  address?: string;
  shorthand?: string;
  identifiers: unknown[];
  division_of?: string;
  aliases: unknown[];
  artists: unknown[];
  writers: unknown[];
  representatives: unknown[];
  creator_attribution?: unknown;
  role?: string;
  behalf_of?: string;
  crm_entity?: ContractCrmLink;
}

export interface ContractArtist {
  name?: string;
  role: string;
  crm_artist?: ContractCrmLink;
  crm_entity?: ContractCrmLink;
  created_at?: string;
  updated_at?: string;
  citations?: ContractCitation[];
}

export interface ContractWriter {
  name?: string;
  role: string;
  crm_writer?: ContractCrmLink;
  crm_entity?: ContractCrmLink;
  created_at?: string;
  updated_at?: string;
  citations?: ContractCitation[];
}

export interface ContractRuleBase {
  type: string;
  definition?: string;
  citations?: ContractCitation[];
}

export interface ContractRoyalty extends ContractExtractionIdentity {
  rule_id?: string;
  rate?: string;
  rate_type?: string;
  title?: string;
  description?: string;
  selection?: string;
  applies_to: string[];
  calculation_base?: ContractRuleBase;
}

export interface ContractSplitParty {
  id: number;
  name: string;
  percentage: string;
  contract_entity_id?: number;
  entity_id?: number;
}

export type ContractSplitAsset = {
  id: number;
  coverage: string;
} & (
  | {
    type: 'recording';
    contract_recording_id: number;
    recording_id: number;
    contract_composition_id?: never;
    composition_id?: never;
  }
  | {
    type: 'composition';
    contract_composition_id: number;
    composition_id: number;
    contract_recording_id?: never;
    recording_id?: never;
  }
);

export interface ContractSplit extends ContractExtractionIdentity {
  source_key: string;
  source_ordinal: number;
  split_type: string;
  asset_identifier?: string;
  rights_type: string;
  revenue_type?: string;
  parties: ContractSplitParty[];
  assets: ContractSplitAsset[];
}

export interface ContractCost extends ContractExtractionIdentity {
  rule_id?: string;
  title?: string;
  description?: string;
  recoupment_rate?: number;
  requires_approval?: boolean;
  cost_base?: ContractRuleBase;
}

export interface ContractCompensation extends ContractExtractionIdentity {
  currency?: string;
  currency_estimated?: boolean;
  advances?: unknown;
  fixed_fees?: unknown;
  recurring_payment_type?: string;
}

export interface ContractDate extends ContractExtractionIdentity {
  extracted_dates?: unknown;
  extracted_terms?: unknown;
  missing_dates?: unknown;
  calculated_end_dates?: unknown;
  calculated_end_date_formulas?: unknown;
  calculated_dates_initialized: boolean;
}

export interface ContractAccountingPeriod extends ContractExtractionIdentity {
  accounting_period?: string;
  reporting_delay_value?: number;
  reporting_delay_unit?: string;
  payment_period_value?: number;
  payment_period_unit?: string;
  payout_threshold_value?: number;
  payout_threshold_currency?: string;
  cross_collateralizes?: boolean;
  audit_rights?: boolean;
  audit_rights_condition?: string;
}

export interface ContractTypeExtraction extends ContractExtractionIdentity {
  type?: string;
  note?: string;
}

export interface ContractLanguage extends ContractExtractionIdentity {
  language?: string;
}

export interface ContractSignature extends ContractExtractionIdentity {
  effective_date?: string;
  name?: string;
  entity?: string;
  signed?: boolean;
  signing_date?: string;
}

export interface ContractControlArea extends ContractExtractionIdentity {
  rule_id?: string;
  description?: string;
  control_type?: string;
  assignment_share?: number;
  exclusivity?: string;
  rights_type?: unknown;
  territories?: unknown;
}

export interface ContractCreativeApproval extends ContractExtractionIdentity {
  approval_id?: string;
  title?: string;
  approval_party: 'assignor' | 'assignee' | 'both_parties';
  description?: string;
}

export interface ContractBalance extends ContractExtractionIdentity {
  title?: string;
  description?: string;
  reasoning?: string;
}

/** @deprecated Use ContractCitation. */
export type ContractCommitmentCitation = ContractCitation;

export type ContractCommitmentLinkedAsset = {
  id: number;
  source?: string;
  created_at: string;
  updated_at?: string;
} & (
  | {
    type: 'recording';
    contract_recording_id: number;
    recording_id: number;
    contract_composition_id?: never;
    composition_id?: never;
  }
  | {
    type: 'composition';
    contract_composition_id: number;
    composition_id: number;
    contract_recording_id?: never;
    recording_id?: never;
  }
);

export interface ContractCommitment extends ContractExtractionIdentity {
  title?: string;
  type?: string;
  description?: string;
  recurring_unit?: string;
  recurring_quantity?: string;
  linked_deliverables: ContractCommitmentDeliverable[];
  linked_assets: ContractCommitmentLinkedAsset[];
}

export interface ContractAssetIdentifier {
  type: string;
  value: string;
  source: string;
}

export interface ContractRecording extends ContractExtractionIdentity {
  name?: string;
  duration_ms?: number;
  artists?: unknown;
  work_type?: string;
  creators?: unknown;
  identifiers: ContractAssetIdentifier[];
  source?: string;
  normalized?: boolean;
  normalized_data?: unknown;
  confidence?: string;
  notes?: string;
  contract_group_id?: number;
}

export interface ContractComposition extends ContractExtractionIdentity {
  name?: string;
  writers?: unknown;
  artists?: unknown;
  work_type?: string;
  creators?: unknown;
  identifiers: ContractAssetIdentifier[];
  source?: string;
  normalized?: boolean;
  normalized_data?: unknown;
  linked_spotify?: string;
  linked_chartmetric?: string;
  linked_mlc?: string;
  confidence?: string;
  notes?: string;
  contract_group_id?: number;
}

export interface ContractRelation {
  name?: string;
  email?: string;
  phone?: string;
  department?: string;
  role: string;
  crm_relation?: ContractCrmLink;
  crm_entity?: ContractCrmLink;
  created_at?: string;
  updated_at?: string;
  citations?: ContractCitation[];
}

export interface ContractTarget extends ContractExtractionIdentity {
  composition_id?: number;
  recording_id?: number;
  album_id?: string;
  number_of_tracks?: unknown;
  sales_targets?: unknown[];
  price_targets?: unknown[];
}

export interface ContractExtractionMap {
  entities: ContractEntity;
  artists: ContractArtist;
  writers: ContractWriter;
  royalties: ContractRoyalty;
  splits: ContractSplit;
  costs: ContractCost;
  compensations: ContractCompensation;
  dates: ContractDate;
  'accounting-periods': ContractAccountingPeriod;
  types: ContractTypeExtraction;
  commitments: ContractCommitment;
  languages: ContractLanguage;
  signatures: ContractSignature;
  'control-areas': ContractControlArea;
  'creative-approvals': ContractCreativeApproval;
  balances: ContractBalance;
  recordings: ContractRecording;
  compositions: ContractComposition;
  relations: ContractRelation;
  targets: ContractTarget;
}

export type ContractExtractionKey = keyof ContractExtractionMap;

export type ContractExtractions = {
  [K in ContractExtractionKey]?: ContractExtractionMap[K][];
};

export interface ResourceScore {
  summary: { score?: number; meanScore?: number; failed?: number; warned?: number } | null;
  triggered_rules: Array<{ rule_id: string; status: 'fail' | 'warn'; severity: string; message: string | null }>;
}

export interface ContractProcesses {
  staging_id: number;
  contract_id: number | null;
  staging_done: boolean;
  extraction_done: boolean;
  staging_terminal: boolean;
  requires_action: boolean;
  available_actions: Array<'retry'>;
  pause_reason: string | null;
  staging_processes: ProcessInfo;
  extraction_processes: {
    stage: string;
    extractions: ExtractionItem[];
  } | null;
}

export interface ExtractionItem {
  name: string;
  status: string;
  completed_at?: string;
}

export interface ContractsUploadOptions {
  base64?: string;
  fileName?: string;
  extractions?: string;
  folder?: string;
  tags?: string;
}

export interface ContractsStatusOptions {
  watch?: boolean;
  timeout?: string;
}

export interface ContractsListOptions {
  page: string;
  perPage: string;
  extractorIds?: string;
  includes?: string;
  score?: boolean;
  citations?: boolean;
  json?: boolean;
}

export interface ContractsGetOptions {
  includes?: string;
  score?: boolean;
  citations?: boolean;
  json?: boolean;
}

export interface ContractsExtractionsOptions {
  page: string;
  perPage: string;
  citations?: boolean;
  json?: boolean;
}

export interface ContractsUpdateOptions {
  tags?: string;
  clearTags?: boolean;
  json?: boolean;
}

export interface ContractUpdateResult {
  id: number;
  tags: string[];
}

export interface ContractsDownloadOptions {
  output?: string;
}
