export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded' | 'free';
export type PaymentMethod = 'stripe' | 'bank_transfer' | 'free';

export interface Organization {
  id: string;
  name: string;
  code: string;
  description?: string;
  contact_email?: string;
  contact_phone?: string;
  address?: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationContestCode {
  id: string;
  organization_id: string;
  contest_id: string;
  invite_code: string;
  max_registrations?: number;
  registration_fee: number;
  currency: string;
  is_active: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface ContestRegistration {
  id: string;
  contest_id: string;
  user_id: string;
  organization_id: string;
  invite_code_id: string;
  payment_status: PaymentStatus;
  payment_method?: PaymentMethod;
  payment_amount: number;
  currency: string;
  stripe_payment_id?: string;
  bank_transfer_proof?: string;
  bank_transfer_note?: string;
  approved_by?: string;
  approved_at?: string;
  registered_at: string;
  updated_at: string;
}

export interface ContestRegistrationWithDetails extends ContestRegistration {
  organization_name?: string;
  user_email?: string;
  user_full_name?: string;
  contest_name?: string;
}

export interface OrganizationContestCodeWithDetails extends OrganizationContestCode {
  organization_name?: string;
  contest_name?: string;
  registration_count?: number;
}
