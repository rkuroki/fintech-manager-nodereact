# TASK-003: Customer Detail Page

## Goal

Build a single Customer page that serves two purposes:

1. **Create** a new customer (`/customers/new`)
2. **View and edit** an existing customer (`/customers/:mnemonic`)

---

## Routing

| Path | Mode |
|---|---|
| `/customers/new` | Creation mode — blank form, submit creates and redirects to `/:mnemonic` |
| `/customers/:mnemonic` | View/edit mode — loads customer by mnemonic from URL |

The mnemonic is the human-readable identifier in the URL (e.g. `/customers/SILVA001`).

---

## Page Structure

The page is composed of five sequential sections (not tabs, not collapsible — always visible):

```
┌─────────────────────────────────────────────────────┐
│ ← Back    Customer Name    [MNEMONIC]  [risk badge] │
├─────────────────────────────────────────────────────┤
│ SECTION 1: Basic Information                        │
│   Full Name, Email, Phone, Risk Profile             │
│   Mnemonic, Created By, Created At                  │
│   [Edit] → opens sidebar drawer                     │
├─────────────────────────────────────────────────────┤
│ SECTION 2: Sensitive Information                    │
│   Tax ID, Date of Birth, Address, Bank Details      │
│   (visible only with read_sensitive permission)     │
│   [Edit] → sidebar drawer (write_sensitive only)    │
├─────────────────────────────────────────────────────┤
│ SECTION 3: Notes & Files                            │
│   [+ Add Note]  [+ Upload File]                     │
│   ● 2024-03-01  📝 "Note content..."  [Edit][Delete]│
│   ● 2024-02-10  📎 contract.pdf       [↓][Delete]   │
├─────────────────────────────────────────────────────┤
│ SECTION 4: Communication History                    │
│   [+ Add Communication]                             │
│   ● 2024-03-05  [meeting]  "Discussed portfolio..." │
│                 recorded by John Manager [Edit][Delete]│
├─────────────────────────────────────────────────────┤
│ SECTION 5: Associated Access Roles                  │
│   [ ] Admin Role                                    │
│   [x] Manager Role                                  │
│   [x] Analyst Role                                  │
│   [Save Changes]  ← visible only to managers        │
└─────────────────────────────────────────────────────┘
```

---

## Section Details

### Section 1 — Basic Information
- Fields: Full Name, Email, Phone, Risk Profile, Mnemonic
- Meta: Created By, Created At, Updated At
- Edit action opens a sidebar drawer with a form
- Required permission to edit: `customers:update`

### Section 2 — Sensitive Information
- Fields: Tax ID, Date of Birth, Address, Bank Details
- Entire section is hidden if user lacks `customers:read_sensitive`
- Edit action opens a sidebar drawer
- Required permission to edit: `customers:write_sensitive`
- Data is stored encrypted on the backend

### Section 3 — Notes & Files (Timeline)
- Displays two types of entries in a single unified timeline sorted by date descending:
  - **Note entries**: discrete text notes added by users
  - **File entries**: uploaded documents
- Each entry shows: date, type icon, content preview / filename
- Actions per entry:
  - Note: **Edit** (opens `NoteFormDrawer`) and **Delete** (confirm modal)
  - File: **Download** and **Delete** (confirm modal)
- Add actions:
  - `[+ Add Note]` → opens `NoteFormDrawer` (empty)
  - `[+ Upload File]` → opens `FileUploadDrawer`
- Required permissions: view = `documents:read` + `investor_profiles:read`; edit = `documents:upload`, `documents:delete`, `investor_profiles:update`

> **Note**: "Notes" here are discrete note records (not the single `investorProfile.notes` text field). The investor profile notes field is separate and not shown in this timeline.

### Section 4 — Communication History (Timeline)
- Displays communication records sorted by `occurredAt` descending
- Each entry shows: date, channel tag (meeting / email / whatsapp / call / other), summary, recorded-by name
- Actions per entry: **Edit** (opens `CommunicationFormDrawer`) and **Delete** (confirm modal)
- `[+ Add Communication]` → opens `CommunicationFormDrawer` (empty)
- Required permissions: view = `communications:read`; edit = `communications:create`

### Section 5 — Associated Access Roles
- Shows a list of all available access roles with checkboxes
- Checked = this customer is currently assigned that role
- `[Save Changes]` button persists the selection
- **Only managers (or admins) can edit this section** — all others see it read-only
- Required permission to edit: `customers:update` AND user has Manager role or `is_admin = true`

---

## Sidebar Drawers

| Drawer | Triggered by | Fields |
|---|---|---|
| `BasicInfoDrawer` | Edit in Section 1 | Full Name, Email, Phone, Risk Profile |
| `SensitiveInfoDrawer` | Edit in Section 2 | Tax ID, DOB, Address, Bank Details |
| `NoteFormDrawer` | Add Note / Edit note | Text content, date |
| `FileUploadDrawer` | Upload File | File picker, label/description |
| `CommunicationFormDrawer` | Add / Edit communication | Channel (select), Summary, Date |

Each drawer opens from the right side, has a title, a form, and Save / Cancel actions.

---

## Backend API Changes

### New Endpoints

| Method | Path | Permission | Description |
|---|---|---|---|
| `GET` | `/api/customers/by-mnemonic/:mnemonic` | `customers:read` | Fetch customer by mnemonic |
| `GET` | `/api/customers/:id/roles` | `customers:read` | List assigned access roles |
| `PUT` | `/api/customers/:id/roles` | `customers:update` + manager | Replace role assignments. Body: `{ roleIds: string[] }` |
| `PUT` | `/api/customers/:id/communications/:commId` | `communications:create` | Update a communication record |
| `DELETE` | `/api/customers/:id/communications/:commId` | `communications:create` | Delete a communication record |
| `GET` | `/api/customers/:id/documents/:docId/download` | `documents:read` | Stream document file |
| `POST` | `/api/customers/:id/notes` | `investor_profiles:update` | Create a note entry |
| `PUT` | `/api/customers/:id/notes/:noteId` | `investor_profiles:update` | Update a note entry |
| `DELETE` | `/api/customers/:id/notes/:noteId` | `investor_profiles:update` | Delete a note entry |

### DB Change Required
- New table `customer_notes` (id, customer_id, content, created_by, created_at, updated_at) — since "Notes" are discrete records, not a single text field.

---

## Frontend Components

### New Files

| File | Description |
|---|---|
| `CustomerPage.tsx` | Main page container — handles routing mode (new vs mnemonic), fetches data, renders sections |
| `BasicInfoSection.tsx` | Displays basic fields, triggers `BasicInfoDrawer` |
| `SensitiveInfoSection.tsx` | Permission-guarded sensitive fields, triggers `SensitiveInfoDrawer` |
| `NotesFilesTimeline.tsx` | Unified timeline of notes + files |
| `CommunicationsTimeline.tsx` | Timeline of communication records |
| `AccessRolesSection.tsx` | Checkbox list of roles, manager-only Save button |
| `BasicInfoDrawer.tsx` | Sidebar form for editing basic info |
| `SensitiveInfoDrawer.tsx` | Sidebar form for editing sensitive info |
| `NoteFormDrawer.tsx` | Sidebar form for add/edit notes |
| `FileUploadDrawer.tsx` | Sidebar for uploading documents |
| `CommunicationFormDrawer.tsx` | Sidebar form for add/edit communication records |

### Files to Remove
| File | Reason |
|---|---|
| `CustomerDetailPage.tsx` | Replaced by `CustomerPage.tsx` |
| `CustomerFormDrawer.tsx` | Create flow moves to `/customers/new` page |

### Route Changes

```tsx
// Before
{ path: 'customers/:id', element: <CustomerDetailPage /> }

// After
{ path: 'customers/new',        element: <CustomerPage /> }
{ path: 'customers/:mnemonic',  element: <CustomerPage /> }
```

### Navigation Changes
- `CustomersPage.tsx` row click: `navigate(\`/customers/${record.id}\`)` → `navigate(\`/customers/${record.mnemonic}\`)`
- "New Customer" button: open drawer → `navigate('/customers/new')`

### API Client Updates (`customers.api.ts`)

```typescript
getByMnemonic(mnemonic: string): Promise<CustomerWithSensitive>
listRoles(customerId: string): Promise<AccessRole[]>
updateRoles(customerId: string, roleIds: string[]): Promise<void>
updateCommunication(customerId: string, commId: string, dto): Promise<CommunicationRecord>
deleteCommunication(customerId: string, commId: string): Promise<void>
downloadDocument(customerId: string, docId: string): Promise<Blob>
createNote(customerId: string, dto): Promise<CustomerNote>
updateNote(customerId: string, noteId: string, dto): Promise<CustomerNote>
deleteNote(customerId: string, noteId: string): Promise<void>
```

---

## Permission Matrix

| Section | View Requires | Edit Requires |
|---|---|---|
| Basic Information | `customers:read` | `customers:update` |
| Sensitive Information | `customers:read_sensitive` | `customers:write_sensitive` |
| Notes & Files | `investor_profiles:read` + `documents:read` | `investor_profiles:update` + `documents:upload/delete` |
| Communication History | `communications:read` | `communications:create` |
| Access Roles | `customers:read` | `customers:update` + Manager role or admin |

---

## Verification Checklist

1. Navigate to `/customers/SILVA001` → full page renders with all 5 sections
2. Edit basic info → sidebar opens, saves, and refreshes section
3. Edit sensitive info as manager → encrypts and saves correctly
4. Add a note → appears in Notes & Files timeline immediately
5. Edit an existing note → sidebar pre-fills, saves with updated content
6. Delete a note → confirm modal, entry removed from timeline
7. Upload a file → appears in Notes & Files timeline
8. Download file → file downloads correctly
9. Delete a file → confirm modal, entry removed
10. Add communication → appears in Communication History timeline
11. Edit communication → sidebar pre-fills, saves correctly
12. Delete communication → confirm modal, removed from timeline
13. Access Roles section: manager can toggle and save, analyst sees read-only
14. Navigate to `/customers/new` → blank creation form
15. Submit new customer → redirects to `/customers/{mnemonic}`
16. Navigate directly to `/customers/NONEXISTENT` → shows 404 / not found state
