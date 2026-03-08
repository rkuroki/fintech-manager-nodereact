import { z } from 'zod';

const mnemonicSchema = z
  .string()
  .min(3, 'Mnemonic must be at least 3 characters')
  .max(12, 'Mnemonic must be at most 12 characters')
  .regex(/^[A-Z0-9]+$/, 'Mnemonic must be uppercase letters and numbers only');

export const CreateCustomerSchema = z.object({
  mnemonic: mnemonicSchema.optional(), // optional: system auto-generates if not provided
  fullName: z.string().min(2, 'Full name is required').max(200),
  email: z.string().email().optional().nullable(),
  phone: z.string().optional().nullable(),
  riskProfile: z.enum(['conservative', 'moderate', 'aggressive']).optional().nullable(),
  investorNotes: z.string().max(10000).optional().nullable(),
  // Sensitive fields (require CUSTOMERS_WRITE_SENSITIVE permission)
  taxId: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(), // ISO date string
  address: z.string().max(1000).optional().nullable(),
  bankDetails: z.string().max(2000).optional().nullable(),
});

export type CreateCustomerDto = z.infer<typeof CreateCustomerSchema>;

export const UpdateCustomerSchema = CreateCustomerSchema.partial();
export type UpdateCustomerDto = z.infer<typeof UpdateCustomerSchema>;

export const CreateCommunicationSchema = z.object({
  channel: z.enum(['email', 'phone', 'whatsapp', 'meeting', 'other']),
  summary: z.string().min(1).max(5000),
  occurredAt: z.string().datetime(),
});

export type CreateCommunicationDto = z.infer<typeof CreateCommunicationSchema>;

export const UpdateCommunicationSchema = z.object({
  channel: z.enum(['email', 'phone', 'whatsapp', 'meeting', 'other']).optional(),
  summary: z.string().min(1).max(5000).optional(),
  occurredAt: z.string().datetime().optional(),
});

export type UpdateCommunicationDto = z.infer<typeof UpdateCommunicationSchema>;

export const UpdateCustomerRolesSchema = z.object({
  roleIds: z.array(z.string().uuid()),
});

export type UpdateCustomerRolesDto = z.infer<typeof UpdateCustomerRolesSchema>;

export const UpdateInvestorProfileSchema = z.object({
  notes: z.string().max(10000).optional().nullable(),
  formResponses: z.record(z.unknown()).optional().nullable(),
});

export type UpdateInvestorProfileDto = z.infer<typeof UpdateInvestorProfileSchema>;
