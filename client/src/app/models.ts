export type Role = 'person' | 'caregiver';

export interface User {
  id: string;
  email: string;
  role: Role;
}

export interface Profile extends User {
  safe_contact_name: string | null;
  safe_contact_phone: string | null;
}

export interface AuthResponse {
  user: User;
  token: string;
}

export interface Category {
  code: string;
  label: string;
}

export interface Script {
  headline: string;
  steps: string[];
  grounding_line: string;
}

export interface Intervention {
  id: string;
  script_json: Script;
  created_at: string;
}

export interface EducationNote {
  title: string;
  why_it_happens: string;
  what_helps: string[];
  how_long: string;
  generated_at: string;
}
