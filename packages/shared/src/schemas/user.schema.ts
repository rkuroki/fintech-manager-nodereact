import { z } from 'zod';

const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
    'Password must contain uppercase, lowercase, and a number',
  );

export const CreateUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  alias: z
    .string()
    .min(3, 'Alias must be at least 3 characters')
    .max(30)
    .regex(/^[a-z0-9._-]+$/, 'Alias can only contain lowercase letters, numbers, dots, dashes'),
  password: passwordSchema,
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(200),
  mobileNumber: z.string().optional(),
  identityId: z.string().optional(), // CPF
  isAdmin: z.boolean().default(false),
});

export type CreateUserDto = z.infer<typeof CreateUserSchema>;

export const UpdateUserSchema = z.object({
  email: z.string().email().optional(),
  alias: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9._-]+$/)
    .optional(),
  fullName: z.string().min(2).max(200).optional(),
  mobileNumber: z.string().optional().nullable(),
  identityId: z.string().optional().nullable(),
  isAdmin: z.boolean().optional(),
  isActive: z.boolean().optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserSchema>;

export const CreateGroupSchema = z.object({
  name: z.string().min(2).max(100),
  mnemonic: z
    .string()
    .min(3, 'Mnemonic must be at least 3 characters')
    .max(12, 'Mnemonic must be at most 12 characters')
    .regex(/^[A-Z0-9]+$/, 'Mnemonic must be uppercase letters and numbers only'),
  description: z.string().max(500).optional(),
});

export type CreateGroupDto = z.infer<typeof CreateGroupSchema>;

export const UpdateGroupSchema = CreateGroupSchema.partial();
export type UpdateGroupDto = z.infer<typeof UpdateGroupSchema>;

export const CreateRoleSchema = z.object({
  name: z.string().min(2).max(100),
  description: z.string().max(500).optional(),
  permissions: z.array(z.string()).min(1, 'At least one permission required'),
});

export type CreateRoleDto = z.infer<typeof CreateRoleSchema>;

export const UpdateRoleSchema = CreateRoleSchema.partial();
export type UpdateRoleDto = z.infer<typeof UpdateRoleSchema>;
