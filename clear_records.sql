-- ============================================================
-- Clear All Records (keeps tables intact)
-- Run in Neon SQL Editor
-- ============================================================

TRUNCATE TABLE
  audit_logs,
  announcement_reads,
  supervisor_announcement_recipients,
  supervisor_resource_recipients,
  student_resource_reads,
  notifications,
  thesis_remarks,
  thesis_submissions,
  clearance_steps,
  document_requests,
  grades,
  course_registrations,
  payments,
  fee_records,
  graduands,
  result_batches,
  exam_timetable,
  student_supervisors,
  resources,
  supervisor_resources,
  supervisor_announcements,
  announcements,
  document_uploads,
  students,
  supervisors,
  courses,
  programs,
  users,
  departments
RESTART IDENTITY CASCADE;
