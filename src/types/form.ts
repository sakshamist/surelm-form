export type ApplicationForm = {
  fullname: string;
  email: string;
  phone: string;
  linkedin: string;
  contribution: string;
  interests: string;
  work_showcase: string;
  ownership: string;
  involvement: string;
  referred_by: string;
  resume: File | null;
  other: File | null;
};

export type Referral = {
  slug: string;
  name: string;
};

export type FormStatus = 'idle' | 'submitting' | 'success' | 'error';

export type FormResponse = {
  success?: boolean;
  message?: string;
  error?: string;
  files_attached?: number;
};

export type FormErrors = {
  [K in keyof ApplicationForm]?: string;
};

export type FileValidation = {
  valid: boolean;
  error?: string;
};