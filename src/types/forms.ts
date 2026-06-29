/**
 * Type definitions for form structures used across the extension
 */

export type FieldType =
  | 'text'
  | 'email'
  | 'password'
  | 'number'
  | 'date'
  | 'select'
  | 'checkbox'
  | 'radio'
  | 'textarea'
  | 'hidden'
  | 'unknown';

export interface FormField {
  id: string;
  originalId?: string;
  name?: string;
  label?: string;
  type: FieldType;
  placeholder?: string;
  category?: string;
  required?: boolean;
  selector?: string;
  source?: 'main' | 'iframe';
  iframePath?: string;
  xpath?: string;
  visible: boolean;
  editable: boolean;
}

export interface Form {
  id: string;
  source: 'main' | 'iframe';
  iframePath?: string;
  depth?: number;
  fields: FormField[];
}

export interface FormSummary {
  totalForms: number;
  totalFields: number;
  categories: Record<string, number>;
  pageUrl: string;
  pageTitle: string;
}
