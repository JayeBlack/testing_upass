# Real Auth Integration Plan

Backend stays in your `backend/` directory (you'll run the backend prompt separately). This plan covers the **frontend changes** and the **small backend additions** needed to support force-password-change + superadmin reset.

## 1. Backend additions (in `backend/`)

Add to existing Node/Express code (not generated from scratch — your separate prompt handles the full rebuild, this is the auth-specific delta you'll need either way):

- Migration `015_password_policy.sql`:
  - `users.must_change_password BOOLEAN DEFAULT TRUE`
  - `users.last_password_change TIMESTAMP`
- `authController.changePassword` — `POST /api/auth/change-password` (authenticated): verifies `old_password`, hashes new, sets `must_change_password = false`.
- `authController.adminResetPassword` — `POST /api/auth/admin/reset-password` (super-admin only): resets a user's password to their student index number (or staff email local-part for staff) and sets `must_change_password = true`.
- `login` response includes `must_change_password`.
- Student creation flow auto-sets `password_hash = bcrypt(index_number)` and `must_change_password = true`.
- Staff creation endpoint `POST /api/auth/admin/create-staff` (super-admin): create user with default password = email local-part, `must_change_password = true`.

## 2. Frontend — API client

- New `src/lib/api.ts`:
  - `API_BASE_URL` from `import.meta.env.VITE_API_BASE_URL` (fallback `http://localhost:5000/api`).
  - `apiFetch(path, options)` attaches `Authorization: Bearer <token>` from localStorage, throws on non-2xx.
- Add `VITE_API_BASE_URL` doc note (user sets in `.env`).

## 3. Frontend — Replace mock `AuthContext`

Rewrite `src/contexts/AuthContext.tsx`:
- `login(email, password)` → `POST /api/auth/login`, store JWT + user, expose `mustChangePassword`.
- `changePassword(oldPwd, newPwd)` → `POST /api/auth/change-password`.
- `logout` clears token + user.
- On mount: if token exists, call `GET /api/auth/me` to rehydrate; on 401 clear.
- Remove all `mockUsers`, `departmentalAdmins`, `superAdminUser` constants.

## 4. Force password change on first login

- New page `src/pages/ChangePassword.tsx` (old + new + confirm).
- New guard component `RequirePasswordChange` wrapping `DashboardLayout` routes: if `user.mustChangePassword`, redirect to `/change-password`; that page only allows submitting the change form (no sidebar nav links work until done).

## 5. Superadmin UI

- In `src/pages/admin/ManageUsers.tsx`:
  - Show only when `user.isSuperAdmin`: "Create Staff" dialog (name, email, role, department) → `POST /api/auth/admin/create-staff`. Toast shows the default password (email local-part).
  - Per-row "Reset Password" button → `POST /api/auth/admin/reset-password` → toast confirms reset to index number / email local-part.
- `ManageStudents.tsx`: per-row "Reset Password" for super-admin only.

## 6. Remove mock seed data

- `src/contexts/DataStoreContext.tsx`: replace hardcoded students/staff/payments/etc. seed arrays with empty arrays + `useEffect` loaders that fetch from backend (`/api/students`, `/api/supervisors`, …). Lists will be empty until you create real records.
- Keep mock data ONLY for catalog/reference data that isn't user-generated (programmes, courses catalog).

## 7. Login page

- `src/pages/Login.tsx`: surface real backend errors (invalid credentials, network); after login redirect to `/change-password` if `mustChangePassword` else `/dashboard`.

## Out of scope (this round)

- Forgot-password-by-email (no SMTP yet). For now self-service recovery = ask superadmin to reset.
- Migrating every page's mock arrays — only the user/student/staff lists are de-mocked now. Other domain mocks (results, payments) stay until backend endpoints exist; we can de-mock them page-by-page next.

## Files touched

- new: `src/lib/api.ts`, `src/pages/ChangePassword.tsx`, `src/components/RequirePasswordChange.tsx`, `backend/src/db/migrations/015_password_policy.sql`
- edit: `src/contexts/AuthContext.tsx`, `src/contexts/DataStoreContext.tsx`, `src/pages/Login.tsx`, `src/pages/admin/ManageUsers.tsx`, `src/pages/admin/ManageStudents.tsx`, `src/App.tsx` (mount guard + route), `backend/src/controllers/authController.js`, `backend/src/routes/authRoutes.js`, `backend/src/controllers/studentController.js` (hash index# on create)

Confirm and I'll implement.
