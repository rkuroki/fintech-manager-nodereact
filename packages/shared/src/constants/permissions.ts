export const PERMISSIONS = {
  // Users
  USERS_READ: 'users:read',
  USERS_CREATE: 'users:create',
  USERS_UPDATE: 'users:update',
  USERS_DELETE: 'users:delete',

  // User Groups
  GROUPS_READ: 'groups:read',
  GROUPS_CREATE: 'groups:create',
  GROUPS_UPDATE: 'groups:update',
  GROUPS_DELETE: 'groups:delete',
  GROUPS_MANAGE_MEMBERS: 'groups:manage_members',

  // Access Roles
  ROLES_READ: 'roles:read',
  ROLES_CREATE: 'roles:create',
  ROLES_UPDATE: 'roles:update',
  ROLES_DELETE: 'roles:delete',

  // Customers
  CUSTOMERS_READ: 'customers:read',
  CUSTOMERS_CREATE: 'customers:create',
  CUSTOMERS_UPDATE: 'customers:update',
  CUSTOMERS_DELETE: 'customers:delete',
  CUSTOMERS_READ_SENSITIVE: 'customers:read_sensitive',
  CUSTOMERS_WRITE_SENSITIVE: 'customers:write_sensitive',

  // Customer Documents
  DOCUMENTS_READ: 'documents:read',
  DOCUMENTS_UPLOAD: 'documents:upload',
  DOCUMENTS_DELETE: 'documents:delete',

  // Communications
  COMMUNICATIONS_READ: 'communications:read',
  COMMUNICATIONS_CREATE: 'communications:create',

  // Investor Profiles
  INVESTOR_PROFILES_READ: 'investor_profiles:read',
  INVESTOR_PROFILES_UPDATE: 'investor_profiles:update',

  // Audit
  AUDIT_READ: 'audit:read',
  ACTIVITY_READ: 'activity:read',

  // Gmail
  GMAIL_CONNECT: 'gmail:connect',
  GMAIL_SYNC: 'gmail:sync',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

/** Permissions granted to the built-in admin role (all permissions) */
export const ADMIN_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

/** Default permissions for a basic non-admin user */
export const DEFAULT_USER_PERMISSIONS: Permission[] = [
  PERMISSIONS.CUSTOMERS_READ,
  PERMISSIONS.DOCUMENTS_READ,
  PERMISSIONS.COMMUNICATIONS_READ,
  PERMISSIONS.INVESTOR_PROFILES_READ,
];

/** Permissions granted to the manager role */
export const MANAGER_PERMISSIONS: Permission[] = [
  ...DEFAULT_USER_PERMISSIONS,
  PERMISSIONS.CUSTOMERS_CREATE,
  PERMISSIONS.CUSTOMERS_UPDATE,
  PERMISSIONS.CUSTOMERS_READ_SENSITIVE,
  PERMISSIONS.CUSTOMERS_WRITE_SENSITIVE,
  PERMISSIONS.DOCUMENTS_UPLOAD,
  PERMISSIONS.COMMUNICATIONS_CREATE,
  PERMISSIONS.INVESTOR_PROFILES_UPDATE,
  PERMISSIONS.AUDIT_READ,
  PERMISSIONS.GMAIL_CONNECT,
  PERMISSIONS.GMAIL_SYNC,
];
