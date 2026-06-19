-- ============================================================
-- 008: Fees & Payments
-- ============================================================

CREATE TABLE IF NOT EXISTS fee_records (
  id            SERIAL PRIMARY KEY,
  student_id    INTEGER REFERENCES students(id) ON DELETE CASCADE,
  semester      VARCHAR(50) NOT NULL,
  academic_year VARCHAR(20) NOT NULL,
  total_amount  NUMERIC(10,2) NOT NULL,
  amount_paid   NUMERIC(10,2) DEFAULT 0,
  outstanding   NUMERIC(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  status        VARCHAR(20) DEFAULT 'Pending',  -- Paid, Partial, Pending
  is_cleared    BOOLEAN DEFAULT FALSE,
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payments (
  id              SERIAL PRIMARY KEY,
  fee_record_id   INTEGER UNIQUE REFERENCES fee_records(id) ON DELETE CASCADE,
  amount          NUMERIC(10,2) NOT NULL,
  payment_method  VARCHAR(50),    -- MTN MoMo, Vodafone Cash, Bank Card, Bank Transfer
  reference       VARCHAR(100),
  receipt_url     TEXT,
  status          VARCHAR(20) DEFAULT 'Pending',  -- Pending, Verified, Rejected
  paid_at         TIMESTAMP DEFAULT NOW(),
  verified_by     INTEGER REFERENCES users(id),
  verified_at     TIMESTAMP
);

CREATE INDEX idx_fees_student ON fee_records(student_id);
