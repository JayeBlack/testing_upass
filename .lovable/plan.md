
## Stakeholder Requirements Implementation Plan

### Phase 1: Student Changes
1. **Add reference number to profile details** — Show index number prominently in student profile/dashboard
2. **Remove Exam Timetable** — Remove the page and its route/nav link
3. **Clean up AI chatbot suggestions** — Remove pre-admission questions from the chatbot interface
4. **Add download receipt at Financial Status** — Add a receipt download button for fee payments

### Phase 2: Accountant Changes
1. **Fee Analytics** — Add more departments to analytics data
2. **Student Fees filtering** — Add department/program checkbox filters
3. **Export Reports** — Add CSV and Excel download formats alongside PDF
4. **Announcement page** — Create fee notification page for accountant
5. **Import feature** — Add file upload to import fee data for analytics
6. **Graduate count** — Show number of graduates on dashboard/analytics

### Phase 3: Dean/Admin Changes
1. **Enroll Student** — Add Excel file upload for bulk student enrollment
2. **System log** — Add activity log page for admins
3. **Pass List** — Add CSV export format

### Phase 4: Exams Officer Changes
1. **Grade Entry** — Add delete published results feature
2. **Publish Results** — Add delete from history + download feature
3. **Pass List** — Change PDF to CSV, add department/program filters
4. **Field label changes** — Change "department" to "programs" where needed

### Phase 5: Admin Role Split
1. **Departmental Admin** — Add department field to admin users, filter all admin pages by department
2. **Super Admin** — Add department filter dropdown on all admin pages for super admin access

### Notes
- Supervisor: No changes, just inspection
- All download format changes from PDF to CSV should be applied consistently across admin pages

---

## Phase 6: Accountant CSV & Bank Payment Workflow

### 6.1 Fee List CSV (accountant publishes)
- **One row per student.** Single fee item = school fees (GH₵, with pesewas, decimal e.g. `4250.50`).
- **Columns:** `index_number, full_name, programme, level, academic_year, semester, total_fee_ghs`
  - `index_number` is the match key (`UMaT/PG/XXXX/YY`)
  - `programme` included for grouping/validation; mismatches against student record are flagged but do not block import
- **Re-upload behaviour:**
  - Existing student (matched by index) → update `total_fee_ghs`; recompute `outstanding = total − paid_so_far`
  - New student in CSV → create fee record
  - Student in system but missing from CSV → leave untouched, surface in a "not in latest list" report
  - Show a diff preview (added / updated / unchanged / removed) before commit
- Validation: index format, programme exists, amount > 0, no duplicate index in file.

### 6.2 Bank Payment CSV (manual today, real API later)
- Students pay at the bank; accountant uploads the bank's payment file to update fee status.
- **Columns:** `teller_no, paid_at, index_number, amount_ghs, bank_branch, narration`
- **Auto-match by index number** = system finds the fee record whose `index_number` matches the row and credits `amount_ghs` against it. No manual linking needed for clean rows.
- Payments are full payments for now; partial logic deferred until requirement changes.
- Unmatched rows (unknown index, duplicate teller_no, amount mismatch) land in an exceptions queue for the accountant to resolve manually.
- On successful match: payment recorded, `amount_paid` increased, `is_cleared` flips when fully paid, student sees updated Financial Status + notification.

### 6.3 Service boundary (swap-ready)
- `src/services/paymentsProvider.ts` exposes `fetchBankPayments()`.
- **Today:** parses the uploaded bank CSV.
- **Tomorrow:** body swapped to call the school's bank API. No other file changes.
- The accountant still triggers the sync; the real API just removes the upload step.

### 6.4 Out of scope (Phase 6)
- Hubtel / MoMo / Paystack online payment providers — removed from roadmap.
