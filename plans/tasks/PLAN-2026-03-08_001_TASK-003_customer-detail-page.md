# TASK-003: Customer Detail Page (Full Rewrite)

## Current State
- Route: `/customers/:id` (internal UUID)
- Simple tab layout: General Info | Investor Profile | Communications
- Read-only display, no inline editing
- No documents tab, no access roles section
- Create/edit via separate `CustomerFormDrawer` from list page

## Requirements
1. URL uses **customer mnemonic**: `/customers/:mnemonic`
2. Single-page layout with **collapsible sections** (not tabs)
3. Sections: Basic Info, Sensitive Info, Notes & Files, Communication History, Access Roles
4. Access Roles section: **only managers can edit**
5. Notes & Files / Communication History displayed as **timeline**
6. Timeline items support **create, edit, delete** via **sidebar drawer**
7. Page serves for both **creation** and **viewing/editing**

## Page Layout

```
┌─────────────────────────────────────────────────┐
│ ← Back    Customer Name   [MNEMONIC] [risk]     │
│           [Edit] [Delete]                        │
├─────────────────────────────────────────────────┤
│ SECTION 1: Basic Information                     │
│   Full Name, Email, Phone, Risk Profile          │
│   Mnemonic, Created By, Created At               │
│   [Edit] → opens drawer                         │
├─────────────────────────────────────────────────┤
│ SECTION 2: Sensitive Information                 │
│   (only visible with customers:read_sensitive)   │
│   Tax ID, DOB, Address, Bank Details             │
│   [Edit] → drawer (only write_sensitive)         │
├─────────────────────────────────────────────────┤
│ SECTION 3: Notes & Files (Timeline)              │
│   [+ Add Note] [+ Upload File]                   │
│   ● date  Note: "summary..."  [Edit] [Delete]   │
│   ● date  File: "name.pdf"    [Download] [Delete]│
├─────────────────────────────────────────────────┤
│ SECTION 4: Communication History (Timeline)      │
│   [+ Add Communication]                          │
│   ● date [channel] "summary..." [Edit] [Delete]  │
├─────────────────────────────────────────────────┤
│ SECTION 5: Access Roles                          │
│   Checkbox list of all roles                     │
│   [Save Changes] (manager-only)                  │
└─────────────────────────────────────────────────┘
```

## Backend API Changes

### New Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/customers/by-mnemonic/:mnemonic` | `customers:read` | Get customer by mnemonic (redirects to existing getCustomer logic) |
| `GET` | `/api/customers/:id/roles` | `customers:read` | List customer's assigned access roles |
| `PUT` | `/api/customers/:id/roles` | `customers:update` + manager | Replace customer's role assignments. Body: `{ roleIds: string[] }` |
| `PUT` | `/api/customers/:id/communications/:commId` | `communications:create` | Update a communication record |
| `DELETE` | `/api/customers/:id/communications/:commId` | `communications:create` | Delete a communication record |
| `GET` | `/api/customers/:id/documents/:docId/download` | `documents:read` | Download document file (stream) |

### Modified Endpoints

| Method | Path | Change |
|---|---|---|
| `GET` | `/api/customers/:id` | Also return `accessRoles[]` in response |

## Frontend Components

### New Files

| Component | Description |
|---|---|
| `CustomerPage.tsx` | Main page — fetches customer by mnemonic, renders all sections |
| `BasicInfoSection.tsx` | `Descriptions` component + edit drawer |
| `SensitiveInfoSection.tsx` | Permission-guarded, `SensitiveField` components + edit drawer |
| `NotesFilesTimeline.tsx` | Ant Design `Timeline` merging investor notes + documents, sorted by date |
| `CommunicationsTimeline.tsx` | Ant Design `Timeline` for communication records |
| `AccessRolesSection.tsx` | Checkbox/transfer list of roles, manager-only save |
| `NoteFormDrawer.tsx` | Sidebar for add/edit investor notes |
| `CommunicationFormDrawer.tsx` | Sidebar for add/edit communication records |
| `FileUploadDrawer.tsx` | Sidebar for uploading documents |

### Route Changes

```tsx
// routes.tsx — change
{ path: 'customers/:id', ... }
// to
{ path: 'customers/new', element: <CustomerPage /> }       // create mode
{ path: 'customers/:mnemonic', element: <CustomerPage /> }  // view/edit mode
```

### Navigation Updates
- `CustomersPage.tsx`: Change `navigate(\`/customers/${record.id}\`)` to `navigate(\`/customers/${record.mnemonic}\`)`
- "New Customer" button: navigate to `/customers/new` instead of opening drawer

### API Client Updates

**`customers.api.ts`** — add:
```typescript
getByMnemonic: (mnemonic: string) => Promise<CustomerWithSensitive>
listRoles: (customerId: string) => Promise<CustomerAccessRole[]>
updateRoles: (customerId: string, roleIds: string[]) => Promise<void>
updateCommunication: (customerId: string, commId: string, dto) => Promise<CommunicationRecord>
deleteCommunication: (customerId: string, commId: string) => Promise<void>
downloadDocument: (customerId: string, docId: string) => Promise<Blob>
```

## Timeline Implementation Details

### Notes & Files Timeline
- **Data sources**: `investorProfile.notes` (single text field) + `customerDocuments[]`
- Merge into single array, sort by date descending
- Each timeline item shows: date, type icon (note/file), content preview, action buttons
- Note items: edit opens `NoteFormDrawer`, delete confirms
- File items: download button, delete confirms
- **Investor notes** are currently a single text field — consider making them a list (or keep as single editable block)

### Communication History Timeline
- **Data source**: `communicationHistory[]` sorted by `occurredAt` descending
- Each item shows: date, channel tag, summary, recorded by, action buttons
- Add/Edit opens `CommunicationFormDrawer`
- Delete confirms via modal

## Permission Matrix

| Section | View | Edit |
|---|---|---|
| Basic Info | `customers:read` | `customers:update` |
| Sensitive Info | `customers:read_sensitive` | `customers:write_sensitive` |
| Notes & Files | `investor_profiles:read` + `documents:read` | `investor_profiles:update` + `documents:upload/delete` |
| Communications | `communications:read` | `communications:create` |
| Access Roles | `customers:read` | `customers:update` + user has Manager role or is admin |

## Files to Change
| File | Action |
|---|---|
| `packages/frontend/src/pages/Customers/CustomerPage.tsx` | Create (main page) |
| `packages/frontend/src/pages/Customers/BasicInfoSection.tsx` | Create |
| `packages/frontend/src/pages/Customers/SensitiveInfoSection.tsx` | Create |
| `packages/frontend/src/pages/Customers/NotesFilesTimeline.tsx` | Create |
| `packages/frontend/src/pages/Customers/CommunicationsTimeline.tsx` | Create |
| `packages/frontend/src/pages/Customers/AccessRolesSection.tsx` | Create |
| `packages/frontend/src/pages/Customers/NoteFormDrawer.tsx` | Create |
| `packages/frontend/src/pages/Customers/CommunicationFormDrawer.tsx` | Create |
| `packages/frontend/src/pages/Customers/FileUploadDrawer.tsx` | Create |
| `packages/frontend/src/pages/Customers/CustomerDetailPage.tsx` | Delete (replaced by CustomerPage) |
| `packages/frontend/src/pages/Customers/CustomersPage.tsx` | Update navigation links |
| `packages/frontend/src/router/routes.tsx` | Update route path |
| `packages/frontend/src/api/customers.api.ts` | Add new API methods |
| `packages/backend/src/domains/customers/customers.routes.ts` | Add new endpoints |
| `packages/backend/src/domains/customers/customers.service.ts` | Add new service methods |
| `packages/backend/src/domains/customers/customers.repository.ts` | Add new repository queries |
| `packages/shared/src/schemas/customer.schema.ts` | Add UpdateCommunicationSchema |

## Verification
1. Navigate to `/customers/SILVA001` → full detail page renders
2. Edit basic info → saves and refreshes
3. Edit sensitive info (as manager) → encrypts and saves
4. Add note → appears in timeline
5. Upload file → appears in timeline, download works
6. Add communication → appears in timeline
7. Edit/delete timeline items → works via sidebar drawer
8. Access roles → manager can toggle roles, analyst sees read-only
9. Create new customer at `/customers/new` → redirects to `/customers/{mnemonic}` on success
