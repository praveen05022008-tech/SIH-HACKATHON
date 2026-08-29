export interface User {
  email: string;
  name: string;
  role: 'HSE Manager' | 'HSE Analyst' | 'Reviewer' | 'Admin';
  token?: string;
}

export interface Site {
  id: number;
  name: string;
  code: string;
  location: string;
}

export interface Unit {
  id: number;
  site_id: number;
  name: string;
  code: string;
}

export interface SafetyReport {
  id: number;
  raw_text: string;
  timestamp: string;
  status: 'Pending' | 'Analyzed' | 'Error';
}

export interface SafetyEvent {
  id: string;
  report_id?: number;
  timestamp: string;
  site: string;
  unit: string;
  location: string;
  activity: string;
  description: string;
  hazard: string;
  energy_source: string;
  barrier: string;
  barrier_failure: string;
  exposure: string;
  consequence: string;
  sif_probability: number;
  confidence: number;
  life_saving_rule: string;
  status: 'Needs Review' | 'Confirmed' | 'Corrected' | 'Non-SIF';
  reviewer: string | null;
  evidence: string;
  
  // Operational Hierarchy (L1-L6)
  l1_milestone: string;
  l2_unit: string;
  l3_discipline: string;
  l4_work_package: string;
  l5_activity: string;
  l6_job: string;
}

export interface PrecursorPattern {
  id: string;
  name: string;
  occurrences: number;
  sites: number;
  activities: string;
  life_saving_rule: string;
  trend: string;
  barrier_failure: string;
  risk_level: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface Review {
  id: number;
  event_id: string;
  reviewer_name: string;
  original_sif: string;
  original_rule: string;
  corrected_sif: string;
  corrected_rule: string;
  timestamp: string;
}

export interface LearningEvent {
  id: number;
  review_id: number;
  event_id: string;
  original_prediction: string;
  reviewer_decision: string;
  learning_signal: string;
  timestamp: string;
}

export interface AuditEvent {
  id: number;
  event_id: string;
  action: string;
  details: string;
  user_email: string;
  timestamp: string;
}

export interface Intervention {
  id: number;
  event_id: string;
  description: string;
  status: 'Open' | 'Closed';
  assigned_to: string;
  due_date: string;
  action_taken?: string;
  created_at: string;
}

export interface KPIStats {
  total_reports: number;
  sif_potential: number;
  high_priority: number;
  open_interventions: number;
}

export interface SitePrecursorDensity {
  site: string;
  reports: number;
  sif_percentage: number;
  high_potential_count: number;
  trend: string;
}

export interface LifeSavingRuleStat {
  name: string;
  reports_count: number;
  sif_count: number;
  precursor_density: string;
  common_barrier_failure: string;
  top_site: string;
}

export interface DashboardResponse {
  kpis: KPIStats;
  site_densities: SitePrecursorDensity[];
  life_saving_rules: LifeSavingRuleStat[];
  recent_events: SafetyEvent[];
}
