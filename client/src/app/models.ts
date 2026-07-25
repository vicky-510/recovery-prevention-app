export type Role = 'person' | 'caregiver';

export interface User {
  id: string;
  email: string;
  role: Role;
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
