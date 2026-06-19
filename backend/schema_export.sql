-- ============================================================
-- UPASS Database Schema Export
-- Generated: 2026-06-19T16:01:14.613Z
-- ============================================================

-- Drop existing tables (careful!)
-- Uncomment the following lines if you want to recreate tables
-- DROP TABLE IF EXISTS clearance_steps CASCADE;
-- DROP TABLE IF EXISTS fee_records CASCADE;
-- DROP TABLE IF EXISTS grades CASCADE;
-- DROP TABLE IF EXISTS graduands CASCADE;
-- DROP TABLE IF EXISTS student_supervisors CASCADE;
-- DROP TABLE IF EXISTS supervisors CASCADE;
-- DROP TABLE IF EXISTS students CASCADE;
-- DROP TABLE IF EXISTS courses CASCADE;
-- DROP TABLE IF EXISTS programs CASCADE;
-- DROP TABLE IF EXISTS departments CASCADE;
-- DROP TABLE IF EXISTS users CASCADE;

BEGIN;


-- Table: announcement_reads
CREATE TABLE announcement_reads (id integer NOT NULL DEFAULT nextval('announcement_reads_id_seq'::regclass), announcement_id integer, user_id integer, read_at timestamp without time zone DEFAULT now());
ALTER TABLE announcement_reads ADD CONSTRAINT announcement_reads_id_not_null NOT NULL id;
ALTER TABLE announcement_reads ADD CONSTRAINT announcement_reads_pkey PRIMARY KEY (id);
ALTER TABLE announcement_reads ADD CONSTRAINT announcement_reads_announcement_id_user_id_key UNIQUE (announcement_id, user_id);
ALTER TABLE announcement_reads ADD CONSTRAINT announcement_reads_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE;
ALTER TABLE announcement_reads ADD CONSTRAINT announcement_reads_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Table: announcements
CREATE TABLE announcements (id integer NOT NULL DEFAULT nextval('announcements_id_seq'::regclass), author_id integer, text text NOT NULL, visibility character varying(100) DEFAULT 'All Students'::character varying, attachment_name character varying(255), attachment_url text, scheduled_at timestamp without time zone, created_at timestamp without time zone DEFAULT now());
ALTER TABLE announcements ADD CONSTRAINT announcements_id_not_null NOT NULL id;
ALTER TABLE announcements ADD CONSTRAINT announcements_text_not_null NOT NULL text;
ALTER TABLE announcements ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);
ALTER TABLE announcements ADD CONSTRAINT announcements_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE;

-- Table: audit_logs
CREATE TABLE audit_logs (id integer NOT NULL DEFAULT nextval('audit_logs_id_seq'::regclass), user_id integer, actor_name character varying(255), actor_role USER-DEFINED, action character varying(100) NOT NULL, entity character varying(100), entity_id character varying(100), details jsonb, ip_address character varying(50), created_at timestamp without time zone DEFAULT now());
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_id_not_null NOT NULL id;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_action_not_null NOT NULL action;
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);
ALTER TABLE audit_logs ADD CONSTRAINT audit_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL;

-- Table: clearance_steps
CREATE TABLE clearance_steps (id integer NOT NULL DEFAULT nextval('clearance_steps_id_seq'::regclass), student_id integer, department character varying(100) NOT NULL, description text, status character varying(20) DEFAULT 'not_started'::character varying, cleared_by character varying(150), cleared_at timestamp without time zone, note text, step_order integer DEFAULT 0, created_at timestamp without time zone DEFAULT now());
ALTER TABLE clearance_steps ADD CONSTRAINT clearance_steps_id_not_null NOT NULL id;
ALTER TABLE clearance_steps ADD CONSTRAINT clearance_steps_department_not_null NOT NULL department;
ALTER TABLE clearance_steps ADD CONSTRAINT clearance_steps_pkey PRIMARY KEY (id);
ALTER TABLE clearance_steps ADD CONSTRAINT clearance_steps_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Table: course_registrations
CREATE TABLE course_registrations (id integer NOT NULL DEFAULT nextval('course_registrations_id_seq'::regclass), student_id integer, course_id integer, semester integer NOT NULL, academic_year character varying(20) NOT NULL, status character varying(20) DEFAULT 'Registered'::character varying, registered_at timestamp without time zone DEFAULT now());
ALTER TABLE course_registrations ADD CONSTRAINT course_registrations_id_not_null NOT NULL id;
ALTER TABLE course_registrations ADD CONSTRAINT course_registrations_semester_not_null NOT NULL semester;
ALTER TABLE course_registrations ADD CONSTRAINT course_registrations_academic_year_not_null NOT NULL academic_year;
ALTER TABLE course_registrations ADD CONSTRAINT course_registrations_pkey PRIMARY KEY (id);
ALTER TABLE course_registrations ADD CONSTRAINT course_registrations_student_id_course_id_academic_year_key UNIQUE (student_id, course_id, academic_year);
ALTER TABLE course_registrations ADD CONSTRAINT course_registrations_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE course_registrations ADD CONSTRAINT course_registrations_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- Table: courses
CREATE TABLE courses (id integer NOT NULL DEFAULT nextval('courses_id_seq'::regclass), code character varying(20) NOT NULL, name character varying(200) NOT NULL, credits integer NOT NULL DEFAULT 3, program_id integer, semester integer NOT NULL DEFAULT 1, academic_year character varying(20) NOT NULL, course_type character varying(20) DEFAULT 'elective'::character varying, is_active boolean DEFAULT true);
ALTER TABLE courses ADD CONSTRAINT courses_id_not_null NOT NULL id;
ALTER TABLE courses ADD CONSTRAINT courses_code_not_null NOT NULL code;
ALTER TABLE courses ADD CONSTRAINT courses_name_not_null NOT NULL name;
ALTER TABLE courses ADD CONSTRAINT courses_credits_not_null NOT NULL credits;
ALTER TABLE courses ADD CONSTRAINT courses_semester_not_null NOT NULL semester;
ALTER TABLE courses ADD CONSTRAINT courses_academic_year_not_null NOT NULL academic_year;
ALTER TABLE courses ADD CONSTRAINT courses_pkey PRIMARY KEY (id);
ALTER TABLE courses ADD CONSTRAINT courses_code_key UNIQUE (code);
ALTER TABLE courses ADD CONSTRAINT courses_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id);

-- Table: departments
CREATE TABLE departments (id integer NOT NULL DEFAULT nextval('departments_id_seq'::regclass), name character varying(150) NOT NULL, is_active boolean DEFAULT true);
ALTER TABLE departments ADD CONSTRAINT departments_id_not_null NOT NULL id;
ALTER TABLE departments ADD CONSTRAINT departments_name_not_null NOT NULL name;
ALTER TABLE departments ADD CONSTRAINT departments_pkey PRIMARY KEY (id);
ALTER TABLE departments ADD CONSTRAINT departments_name_key UNIQUE (name);

-- Table: document_requests
CREATE TABLE document_requests (id integer NOT NULL DEFAULT nextval('document_requests_id_seq'::regclass), student_id integer, doc_type character varying(100) NOT NULL, purpose text, status character varying(20) DEFAULT 'Pending'::character varying, requested_at timestamp without time zone DEFAULT now(), completed_at timestamp without time zone, processed_by integer, file_url character varying(500), upload_id integer);
ALTER TABLE document_requests ADD CONSTRAINT document_requests_id_not_null NOT NULL id;
ALTER TABLE document_requests ADD CONSTRAINT document_requests_doc_type_not_null NOT NULL doc_type;
ALTER TABLE document_requests ADD CONSTRAINT document_requests_pkey PRIMARY KEY (id);
ALTER TABLE document_requests ADD CONSTRAINT document_requests_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE document_requests ADD CONSTRAINT document_requests_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES users(id);
ALTER TABLE document_requests ADD CONSTRAINT document_requests_upload_id_fkey FOREIGN KEY (upload_id) REFERENCES document_uploads(id);

-- Table: document_uploads
CREATE TABLE document_uploads (id integer NOT NULL DEFAULT nextval('document_uploads_id_seq'::regclass), title character varying(200) NOT NULL, file_name character varying(255) NOT NULL, file_url character varying(500) NOT NULL, uploaded_by integer, recipient_count integer DEFAULT 0, created_at timestamp without time zone DEFAULT now());
ALTER TABLE document_uploads ADD CONSTRAINT document_uploads_id_not_null NOT NULL id;
ALTER TABLE document_uploads ADD CONSTRAINT document_uploads_title_not_null NOT NULL title;
ALTER TABLE document_uploads ADD CONSTRAINT document_uploads_file_name_not_null NOT NULL file_name;
ALTER TABLE document_uploads ADD CONSTRAINT document_uploads_file_url_not_null NOT NULL file_url;
ALTER TABLE document_uploads ADD CONSTRAINT document_uploads_pkey PRIMARY KEY (id);
ALTER TABLE document_uploads ADD CONSTRAINT document_uploads_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id);

-- Table: exam_timetable
CREATE TABLE exam_timetable (id integer NOT NULL DEFAULT nextval('exam_timetable_id_seq'::regclass), course_id integer, exam_date date NOT NULL, start_time time without time zone NOT NULL, duration character varying(20) NOT NULL, venue character varying(200), exam_type character varying(20) DEFAULT 'Written'::character varying, semester integer NOT NULL, academic_year character varying(20) NOT NULL, created_at timestamp without time zone DEFAULT now());
ALTER TABLE exam_timetable ADD CONSTRAINT exam_timetable_id_not_null NOT NULL id;
ALTER TABLE exam_timetable ADD CONSTRAINT exam_timetable_exam_date_not_null NOT NULL exam_date;
ALTER TABLE exam_timetable ADD CONSTRAINT exam_timetable_start_time_not_null NOT NULL start_time;
ALTER TABLE exam_timetable ADD CONSTRAINT exam_timetable_duration_not_null NOT NULL duration;
ALTER TABLE exam_timetable ADD CONSTRAINT exam_timetable_semester_not_null NOT NULL semester;
ALTER TABLE exam_timetable ADD CONSTRAINT exam_timetable_academic_year_not_null NOT NULL academic_year;
ALTER TABLE exam_timetable ADD CONSTRAINT exam_timetable_pkey PRIMARY KEY (id);
ALTER TABLE exam_timetable ADD CONSTRAINT exam_timetable_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;

-- Table: fee_records
CREATE TABLE fee_records (id integer NOT NULL DEFAULT nextval('fee_records_id_seq'::regclass), student_id integer, semester character varying(50) NOT NULL, academic_year character varying(50) NOT NULL, total_amount numeric NOT NULL, amount_paid numeric DEFAULT 0, outstanding numeric, status character varying(20) DEFAULT 'Pending'::character varying, is_cleared boolean DEFAULT false, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now());
ALTER TABLE fee_records ADD CONSTRAINT fee_records_id_not_null NOT NULL id;
ALTER TABLE fee_records ADD CONSTRAINT fee_records_semester_not_null NOT NULL semester;
ALTER TABLE fee_records ADD CONSTRAINT fee_records_total_amount_not_null NOT NULL total_amount;
ALTER TABLE fee_records ADD CONSTRAINT fee_records_pkey PRIMARY KEY (id);
ALTER TABLE fee_records ADD CONSTRAINT fee_records_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE fee_records ADD CONSTRAINT fee_records_academic_year_not_null NOT NULL academic_year;

-- Table: grades
CREATE TABLE grades (id integer NOT NULL DEFAULT nextval('grades_id_seq'::regclass), student_id integer, course_id integer, grade character varying(5) NOT NULL, marks numeric, semester integer NOT NULL, academic_year character varying(20) NOT NULL, entered_by integer, entered_at timestamp without time zone DEFAULT now());
ALTER TABLE grades ADD CONSTRAINT grades_id_not_null NOT NULL id;
ALTER TABLE grades ADD CONSTRAINT grades_grade_not_null NOT NULL grade;
ALTER TABLE grades ADD CONSTRAINT grades_semester_not_null NOT NULL semester;
ALTER TABLE grades ADD CONSTRAINT grades_academic_year_not_null NOT NULL academic_year;
ALTER TABLE grades ADD CONSTRAINT grades_pkey PRIMARY KEY (id);
ALTER TABLE grades ADD CONSTRAINT grades_student_id_course_id_academic_year_key UNIQUE (student_id, course_id, academic_year);
ALTER TABLE grades ADD CONSTRAINT grades_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE grades ADD CONSTRAINT grades_course_id_fkey FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE;
ALTER TABLE grades ADD CONSTRAINT grades_entered_by_fkey FOREIGN KEY (entered_by) REFERENCES users(id);

-- Table: graduands
CREATE TABLE graduands (id integer NOT NULL DEFAULT nextval('graduands_id_seq'::regclass), student_id integer, academic_year character varying(20) NOT NULL, cwa numeric, status character varying(20) DEFAULT 'Eligible'::character varying, created_at timestamp without time zone DEFAULT now());
ALTER TABLE graduands ADD CONSTRAINT graduands_id_not_null NOT NULL id;
ALTER TABLE graduands ADD CONSTRAINT graduands_academic_year_not_null NOT NULL academic_year;
ALTER TABLE graduands ADD CONSTRAINT graduands_pkey PRIMARY KEY (id);
ALTER TABLE graduands ADD CONSTRAINT graduands_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Table: notifications
CREATE TABLE notifications (id integer NOT NULL DEFAULT nextval('notifications_id_seq'::regclass), user_id integer, title character varying(255) NOT NULL, message text NOT NULL, type character varying(50) DEFAULT 'general'::character varying, severity character varying(20) DEFAULT 'info'::character varying, is_read boolean DEFAULT false, created_at timestamp without time zone DEFAULT now());
ALTER TABLE notifications ADD CONSTRAINT notifications_id_not_null NOT NULL id;
ALTER TABLE notifications ADD CONSTRAINT notifications_title_not_null NOT NULL title;
ALTER TABLE notifications ADD CONSTRAINT notifications_message_not_null NOT NULL message;
ALTER TABLE notifications ADD CONSTRAINT notifications_pkey PRIMARY KEY (id);
ALTER TABLE notifications ADD CONSTRAINT notifications_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Table: payments
CREATE TABLE payments (id integer NOT NULL DEFAULT nextval('payments_id_seq'::regclass), fee_record_id integer, amount numeric NOT NULL, payment_method character varying(50), reference character varying(100), receipt_url text, status character varying(20) DEFAULT 'Pending'::character varying, paid_at timestamp without time zone DEFAULT now(), verified_by integer, verified_at timestamp without time zone, provider character varying(30) DEFAULT 'Manual'::character varying);
ALTER TABLE payments ADD CONSTRAINT payments_id_not_null NOT NULL id;
ALTER TABLE payments ADD CONSTRAINT payments_amount_not_null NOT NULL amount;
ALTER TABLE payments ADD CONSTRAINT payments_pkey PRIMARY KEY (id);
ALTER TABLE payments ADD CONSTRAINT payments_fee_record_id_key UNIQUE (fee_record_id);
ALTER TABLE payments ADD CONSTRAINT payments_fee_record_id_fkey FOREIGN KEY (fee_record_id) REFERENCES fee_records(id) ON DELETE CASCADE;
ALTER TABLE payments ADD CONSTRAINT payments_verified_by_fkey FOREIGN KEY (verified_by) REFERENCES users(id);

-- Table: programs
CREATE TABLE programs (id integer NOT NULL DEFAULT nextval('programs_id_seq'::regclass), name character varying(200) NOT NULL, code character varying(50) NOT NULL, department_id integer, degree_type character varying(50) NOT NULL DEFAULT 'MSc'::character varying, duration_months integer DEFAULT 24, is_active boolean DEFAULT true);
ALTER TABLE programs ADD CONSTRAINT programs_id_not_null NOT NULL id;
ALTER TABLE programs ADD CONSTRAINT programs_name_not_null NOT NULL name;
ALTER TABLE programs ADD CONSTRAINT programs_code_not_null NOT NULL code;
ALTER TABLE programs ADD CONSTRAINT programs_degree_type_not_null NOT NULL degree_type;
ALTER TABLE programs ADD CONSTRAINT programs_pkey PRIMARY KEY (id);
ALTER TABLE programs ADD CONSTRAINT programs_code_key UNIQUE (code);
ALTER TABLE programs ADD CONSTRAINT programs_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id) ON DELETE CASCADE;

-- Table: resources
CREATE TABLE resources (id integer NOT NULL DEFAULT nextval('resources_id_seq'::regclass), uploaded_by integer, file_name character varying(255) NOT NULL, file_url text, file_type character varying(20), file_size character varying(20), category character varying(100), description text, uploaded_at timestamp without time zone DEFAULT now());
ALTER TABLE resources ADD CONSTRAINT resources_id_not_null NOT NULL id;
ALTER TABLE resources ADD CONSTRAINT resources_file_name_not_null NOT NULL file_name;
ALTER TABLE resources ADD CONSTRAINT resources_pkey PRIMARY KEY (id);
ALTER TABLE resources ADD CONSTRAINT resources_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE;

-- Table: result_batches
CREATE TABLE result_batches (id integer NOT NULL DEFAULT nextval('result_batches_id_seq'::regclass), semester character varying(20) NOT NULL, academic_year character varying(20) NOT NULL, department_id integer, program_id integer, student_count integer DEFAULT 0, status character varying(20) DEFAULT 'Draft'::character varying, published_at timestamp without time zone, published_by integer, created_at timestamp without time zone DEFAULT now());
ALTER TABLE result_batches ADD CONSTRAINT result_batches_id_not_null NOT NULL id;
ALTER TABLE result_batches ADD CONSTRAINT result_batches_semester_not_null NOT NULL semester;
ALTER TABLE result_batches ADD CONSTRAINT result_batches_academic_year_not_null NOT NULL academic_year;
ALTER TABLE result_batches ADD CONSTRAINT result_batches_pkey PRIMARY KEY (id);
ALTER TABLE result_batches ADD CONSTRAINT result_batches_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id);
ALTER TABLE result_batches ADD CONSTRAINT result_batches_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id);
ALTER TABLE result_batches ADD CONSTRAINT result_batches_published_by_fkey FOREIGN KEY (published_by) REFERENCES users(id);

-- Table: student_supervisors
CREATE TABLE student_supervisors (id integer NOT NULL DEFAULT nextval('student_supervisors_id_seq'::regclass), student_id integer, supervisor_id integer, assigned_at timestamp without time zone DEFAULT now(), is_primary boolean DEFAULT true);
ALTER TABLE student_supervisors ADD CONSTRAINT student_supervisors_id_not_null NOT NULL id;
ALTER TABLE student_supervisors ADD CONSTRAINT student_supervisors_pkey PRIMARY KEY (id);
ALTER TABLE student_supervisors ADD CONSTRAINT student_supervisors_student_id_supervisor_id_key UNIQUE (student_id, supervisor_id);
ALTER TABLE student_supervisors ADD CONSTRAINT student_supervisors_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE student_supervisors ADD CONSTRAINT student_supervisors_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES supervisors(id) ON DELETE CASCADE;

-- Table: students
CREATE TABLE students (id integer NOT NULL DEFAULT nextval('students_id_seq'::regclass), user_id integer, index_number character varying(50) NOT NULL, program_id integer, department_id integer, admission_year integer NOT NULL, study_mode character varying(20) DEFAULT 'Full-time'::character varying, status character varying(20) DEFAULT 'Active'::character varying, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now(), admission_cycle character varying(20) DEFAULT 'January'::character varying);
ALTER TABLE students ADD CONSTRAINT students_id_not_null NOT NULL id;
ALTER TABLE students ADD CONSTRAINT students_index_number_not_null NOT NULL index_number;
ALTER TABLE students ADD CONSTRAINT students_admission_year_not_null NOT NULL admission_year;
ALTER TABLE students ADD CONSTRAINT students_pkey PRIMARY KEY (id);
ALTER TABLE students ADD CONSTRAINT students_user_id_key UNIQUE (user_id);
ALTER TABLE students ADD CONSTRAINT students_index_number_key UNIQUE (index_number);
ALTER TABLE students ADD CONSTRAINT students_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE students ADD CONSTRAINT students_program_id_fkey FOREIGN KEY (program_id) REFERENCES programs(id);
ALTER TABLE students ADD CONSTRAINT students_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id);

-- Table: supervisor_announcement_recipients
CREATE TABLE supervisor_announcement_recipients (id integer NOT NULL DEFAULT nextval('supervisor_announcement_recipients_id_seq'::regclass), announcement_id integer, student_id integer, is_read boolean DEFAULT false, created_at timestamp without time zone DEFAULT now());
ALTER TABLE supervisor_announcement_recipients ADD CONSTRAINT supervisor_announcement_recipients_id_not_null NOT NULL id;
ALTER TABLE supervisor_announcement_recipients ADD CONSTRAINT supervisor_announcement_recipients_pkey PRIMARY KEY (id);
ALTER TABLE supervisor_announcement_recipients ADD CONSTRAINT supervisor_announcement_recipien_announcement_id_student_id_key UNIQUE (announcement_id, student_id);
ALTER TABLE supervisor_announcement_recipients ADD CONSTRAINT supervisor_announcement_recipients_announcement_id_fkey FOREIGN KEY (announcement_id) REFERENCES supervisor_announcements(id) ON DELETE CASCADE;
ALTER TABLE supervisor_announcement_recipients ADD CONSTRAINT supervisor_announcement_recipients_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Table: supervisor_announcements
CREATE TABLE supervisor_announcements (id integer NOT NULL DEFAULT nextval('supervisor_announcements_id_seq'::regclass), supervisor_id integer, text text NOT NULL, visibility character varying(50) DEFAULT 'All Students'::character varying, scheduled_at timestamp without time zone, created_at timestamp without time zone DEFAULT now());
ALTER TABLE supervisor_announcements ADD CONSTRAINT supervisor_announcements_id_not_null NOT NULL id;
ALTER TABLE supervisor_announcements ADD CONSTRAINT supervisor_announcements_text_not_null NOT NULL text;
ALTER TABLE supervisor_announcements ADD CONSTRAINT supervisor_announcements_pkey PRIMARY KEY (id);
ALTER TABLE supervisor_announcements ADD CONSTRAINT supervisor_announcements_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE;

-- Table: supervisor_resource_recipients
CREATE TABLE supervisor_resource_recipients (id integer NOT NULL DEFAULT nextval('supervisor_resource_recipients_id_seq'::regclass), resource_id integer, student_id integer, created_at timestamp without time zone DEFAULT now());
ALTER TABLE supervisor_resource_recipients ADD CONSTRAINT supervisor_resource_recipients_id_not_null NOT NULL id;
ALTER TABLE supervisor_resource_recipients ADD CONSTRAINT supervisor_resource_recipients_pkey PRIMARY KEY (id);
ALTER TABLE supervisor_resource_recipients ADD CONSTRAINT supervisor_resource_recipients_resource_id_student_id_key UNIQUE (resource_id, student_id);
ALTER TABLE supervisor_resource_recipients ADD CONSTRAINT supervisor_resource_recipients_resource_id_fkey FOREIGN KEY (resource_id) REFERENCES supervisor_resources(id) ON DELETE CASCADE;
ALTER TABLE supervisor_resource_recipients ADD CONSTRAINT supervisor_resource_recipients_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;

-- Table: supervisor_resources
CREATE TABLE supervisor_resources (id integer NOT NULL DEFAULT nextval('supervisor_resources_id_seq'::regclass), supervisor_id integer, title character varying(255) NOT NULL, file_url character varying(500) NOT NULL, category character varying(100) NOT NULL, description text, file_size bigint, created_at timestamp without time zone DEFAULT now());
ALTER TABLE supervisor_resources ADD CONSTRAINT supervisor_resources_id_not_null NOT NULL id;
ALTER TABLE supervisor_resources ADD CONSTRAINT supervisor_resources_title_not_null NOT NULL title;
ALTER TABLE supervisor_resources ADD CONSTRAINT supervisor_resources_file_url_not_null NOT NULL file_url;
ALTER TABLE supervisor_resources ADD CONSTRAINT supervisor_resources_category_not_null NOT NULL category;
ALTER TABLE supervisor_resources ADD CONSTRAINT supervisor_resources_pkey PRIMARY KEY (id);
ALTER TABLE supervisor_resources ADD CONSTRAINT supervisor_resources_supervisor_id_fkey FOREIGN KEY (supervisor_id) REFERENCES users(id) ON DELETE CASCADE;

-- Table: supervisors
CREATE TABLE supervisors (id integer NOT NULL DEFAULT nextval('supervisors_id_seq'::regclass), user_id integer, staff_id character varying(50) NOT NULL, department_id integer, title character varying(50) DEFAULT 'Dr.'::character varying, specialization text, is_active boolean DEFAULT true, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now());
ALTER TABLE supervisors ADD CONSTRAINT supervisors_id_not_null NOT NULL id;
ALTER TABLE supervisors ADD CONSTRAINT supervisors_staff_id_not_null NOT NULL staff_id;
ALTER TABLE supervisors ADD CONSTRAINT supervisors_pkey PRIMARY KEY (id);
ALTER TABLE supervisors ADD CONSTRAINT supervisors_user_id_key UNIQUE (user_id);
ALTER TABLE supervisors ADD CONSTRAINT supervisors_staff_id_key UNIQUE (staff_id);
ALTER TABLE supervisors ADD CONSTRAINT supervisors_user_id_fkey FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE supervisors ADD CONSTRAINT supervisors_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id);

-- Table: thesis_remarks
CREATE TABLE thesis_remarks (id integer NOT NULL DEFAULT nextval('thesis_remarks_id_seq'::regclass), submission_id integer, author_id integer, remark_text text NOT NULL, created_at timestamp without time zone DEFAULT now());
ALTER TABLE thesis_remarks ADD CONSTRAINT thesis_remarks_id_not_null NOT NULL id;
ALTER TABLE thesis_remarks ADD CONSTRAINT thesis_remarks_remark_text_not_null NOT NULL remark_text;
ALTER TABLE thesis_remarks ADD CONSTRAINT thesis_remarks_pkey PRIMARY KEY (id);
ALTER TABLE thesis_remarks ADD CONSTRAINT thesis_remarks_submission_id_fkey FOREIGN KEY (submission_id) REFERENCES thesis_submissions(id) ON DELETE CASCADE;
ALTER TABLE thesis_remarks ADD CONSTRAINT thesis_remarks_author_id_fkey FOREIGN KEY (author_id) REFERENCES users(id);

-- Table: thesis_submissions
CREATE TABLE thesis_submissions (id integer NOT NULL DEFAULT nextval('thesis_submissions_id_seq'::regclass), student_id integer, stage character varying(50) NOT NULL, file_url text, file_name character varying(255), status character varying(20) DEFAULT 'Pending'::character varying, submitted_at timestamp without time zone DEFAULT now(), reviewed_at timestamp without time zone, reviewed_by integer);
ALTER TABLE thesis_submissions ADD CONSTRAINT thesis_submissions_id_not_null NOT NULL id;
ALTER TABLE thesis_submissions ADD CONSTRAINT thesis_submissions_stage_not_null NOT NULL stage;
ALTER TABLE thesis_submissions ADD CONSTRAINT thesis_submissions_pkey PRIMARY KEY (id);
ALTER TABLE thesis_submissions ADD CONSTRAINT thesis_submissions_student_id_fkey FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE;
ALTER TABLE thesis_submissions ADD CONSTRAINT thesis_submissions_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES users(id);

-- Table: users
CREATE TABLE users (id integer NOT NULL DEFAULT nextval('users_id_seq'::regclass), email character varying(255) NOT NULL, password_hash character varying(255) NOT NULL, role USER-DEFINED NOT NULL, first_name character varying(100) NOT NULL, last_name character varying(100) NOT NULL, phone character varying(20), avatar_url text, is_active boolean DEFAULT true, created_at timestamp without time zone DEFAULT now(), updated_at timestamp without time zone DEFAULT now(), department_id integer, is_super_admin boolean DEFAULT false, must_change_password boolean NOT NULL DEFAULT true, last_password_change timestamp without time zone);
ALTER TABLE users ADD CONSTRAINT users_id_not_null NOT NULL id;
ALTER TABLE users ADD CONSTRAINT users_email_not_null NOT NULL email;
ALTER TABLE users ADD CONSTRAINT users_password_hash_not_null NOT NULL password_hash;
ALTER TABLE users ADD CONSTRAINT users_role_not_null NOT NULL role;
ALTER TABLE users ADD CONSTRAINT users_first_name_not_null NOT NULL first_name;
ALTER TABLE users ADD CONSTRAINT users_last_name_not_null NOT NULL last_name;
ALTER TABLE users ADD CONSTRAINT users_pkey PRIMARY KEY (id);
ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
ALTER TABLE users ADD CONSTRAINT users_department_id_fkey FOREIGN KEY (department_id) REFERENCES departments(id);
ALTER TABLE users ADD CONSTRAINT users_must_change_password_not_null NOT NULL must_change_password;

COMMIT;
