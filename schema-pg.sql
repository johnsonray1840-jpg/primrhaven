-- ==========================================================
-- VertexCapitals OTC Platform - PostgreSQL Database Schema
-- Fully Compatible with Neon PostgreSQL & Vercel
-- ==========================================================

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(191) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  country VARCHAR(100) DEFAULT 'United States',
  account_number VARCHAR(30) NOT NULL UNIQUE,
  role VARCHAR(20) DEFAULT 'user',
  status VARCHAR(20) DEFAULT 'active',
  verification_code VARCHAR(10) DEFAULT NULL,
  is_verified SMALLINT DEFAULT 0,
  referral_code VARCHAR(50) NOT NULL UNIQUE,
  referred_by VARCHAR(50) DEFAULT NULL,
  kyc_status VARCHAR(20) DEFAULT 'unverified',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Wallets Table (Exchange & OTC Balances)
CREATE TABLE IF NOT EXISTS wallets (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  exchange_balance NUMERIC(18, 2) DEFAULT 0.00,
  otc_investment_balance NUMERIC(18, 2) DEFAULT 0.00,
  accrued_profit NUMERIC(18, 2) DEFAULT 0.00,
  total_invested NUMERIC(18, 2) DEFAULT 0.00,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_wallets_non_negative CHECK (exchange_balance >= 0 AND otc_investment_balance >= 0 AND accrued_profit >= 0)
);

-- 3. Reusable Public Investment Plans Catalogue Table
CREATE TABLE IF NOT EXISTS investment_plans (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  description TEXT DEFAULT NULL,
  category VARCHAR(30) NOT NULL CHECK (category IN ('Short-Term', 'Long-Term')),
  min_amount NUMERIC(18, 2) NOT NULL DEFAULT 100.00,
  max_amount NUMERIC(18, 2) NOT NULL DEFAULT 100000.00,
  roi_percentage NUMERIC(8, 2) NOT NULL,
  duration_days INT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_icon VARCHAR(100) DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3b. Customer Active & Past Investments (OTC Plans Table)
CREATE TABLE IF NOT EXISTS otc_plans (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  plan_id INT REFERENCES investment_plans(id) ON DELETE SET NULL,
  tranche_name VARCHAR(150) DEFAULT 'Executive Multi-Asset Tranche',
  amount NUMERIC(18, 2) NOT NULL,
  weekly_roi_percent NUMERIC(6, 2) DEFAULT 7.50,
  total_roi_percent NUMERIC(8, 2) DEFAULT NULL,
  total_expected_profit NUMERIC(18, 2) DEFAULT NULL,
  duration_days INT DEFAULT 30,
  days_elapsed INT DEFAULT 0,
  profit_accrued NUMERIC(18, 2) DEFAULT 0.00,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  end_date TIMESTAMPTZ DEFAULT NULL,
  next_payout_date TIMESTAMPTZ DEFAULT NULL,
  maturity_payout_ref VARCHAR(50) UNIQUE DEFAULT NULL,
  matured_at TIMESTAMPTZ DEFAULT NULL
);

-- 4. Transactions Ledger Table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  tx_ref VARCHAR(50) NOT NULL UNIQUE,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  user_name VARCHAR(150) DEFAULT NULL,
  user_email VARCHAR(191) DEFAULT NULL,
  type VARCHAR(30) NOT NULL,
  amount NUMERIC(18, 2) NOT NULL,
  asset VARCHAR(50) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending',
  destination_address VARCHAR(255) DEFAULT NULL,
  tx_hash VARCHAR(255) DEFAULT NULL,
  notes TEXT DEFAULT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Company Official Deposit Wallets
CREATE TABLE IF NOT EXISTS company_wallets (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(50) NOT NULL,
  network VARCHAR(50) NOT NULL,
  address VARCHAR(255) NOT NULL,
  qr_url VARCHAR(500) DEFAULT NULL,
  is_active SMALLINT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Automated Email Logs Table
CREATE TABLE IF NOT EXISTS email_logs (
  id SERIAL PRIMARY KEY,
  user_id INT DEFAULT NULL,
  recipient_email VARCHAR(191) NOT NULL,
  subject VARCHAR(255) NOT NULL,
  body TEXT NOT NULL,
  event_type VARCHAR(50) NOT NULL,
  sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create helpful indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_account_number ON users(account_number);
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_otc_plans_user_id ON otc_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_tx_ref ON transactions(tx_ref);
