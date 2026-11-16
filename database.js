/**
 * VertexCapitals Database Engine
 * Dual-Mode Engine:
 * - If DATABASE_URL / PGHOST is configured (or DB_ENGINE=postgres): connects to Neon PostgreSQL via 'pg' connection pool.
 * - Otherwise: seamlessly falls back to high-reliability embedded JSON store (local dev / offline).
 * 
 * Preserves 100% of the existing function signatures and returns for zero application breaking changes.
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// ----------------------------------------------------
// Database Configuration & Detection
// ----------------------------------------------------
const usePostgres = Boolean(
  process.env.DATABASE_URL ||
  process.env.POSTGRES_URL ||
  process.env.DB_ENGINE === 'postgres' ||
  process.env.DB_ENGINE === 'neon' ||
  process.env.PGHOST
);

let pool = null;

if (usePostgres) {
  const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;
  pool = new Pool({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    },
    // Serverless-optimized connection pool settings for Vercel & Neon
    max: process.env.VERCEL ? 3 : 10, // Prevent connection exhaustion across multiple serverless lambda instances
    idleTimeoutMillis: 15000,          // Close idle connections quickly in serverless environments
    connectionTimeoutMillis: 5000      // Fail fast if database is unreachable
  });

  pool.on('error', (err) => {
    console.error('⚠️ [Neon PostgreSQL Pool Error]:', err.message);
  });
}

// ----------------------------------------------------
// Fallback In-Memory / File Store (for offline local dev)
// ----------------------------------------------------
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'vertex_platform.db.json');
const BACKUP_FILE = path.join(DATA_DIR, 'vertex_platform.db.backup.json');
const TEMP_FILE = path.join(DATA_DIR, 'vertex_platform.db.tmp');

const DEFAULT_STORE = {
  version: '2.0.0',
  users: [
    {
      id: 1,
      full_name: 'Master Administrator',
      email: 'admin@vertexcapitals.ltd',
      password_hash: 'admin123',
      country: 'United States',
      account_number: 'VX-ADMIN-01',
      role: 'admin',
      status: 'active',
      verification_code: null,
      is_verified: 1,
      referral_code: 'VX-ADMIN',
      referred_by: null,
      kyc_status: 'verified',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
  ],
  wallets: [
    {
      id: 1,
      user_id: 1,
      exchange_balance: 100000.00,
      otc_investment_balance: 500000.00,
      accrued_profit: 85000.00,
      total_invested: 500000.00,
      updated_at: new Date().toISOString()
    }
  ],
  otc_plans: [],
  transactions: [
    {
      id: 1,
      tx_ref: 'TX-INIT-001',
      user_id: 1,
      user_name: 'Master Administrator',
      user_email: 'admin@vertexcapitals.ltd',
      type: 'deposit',
      amount: 100000.00,
      asset: 'USDT (TRC20)',
      status: 'completed',
      destination_address: 'Vault System',
      tx_hash: 'INITIAL-LIQUIDITY-VAULT',
      notes: 'Initial Platform Reserve Liquidity',
      created_at: new Date().toISOString()
    }
  ],
  company_wallets: [
    { id: 1, symbol: 'USDT_TRC20', name: 'Tether USD (TRC20)', network: 'Tron Network (TRC20)', address: 'TXJ9m9P7L8sF3GzQ5K2W1bV8c4Xy7ZaBcd', qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=TXJ9m9P7L8sF3GzQ5K2W1bV8c4Xy7ZaBcd', is_active: 1 },
    { id: 2, symbol: 'BTC', name: 'Bitcoin', network: 'Bitcoin Network', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', is_active: 1 },
    { id: 3, symbol: 'ETH', name: 'Ethereum', network: 'Ethereum (ERC20)', address: '0x71C836642F4F13360565780aef863E75532Eefe7', qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=0x71C836642F4F13360565780aef863E75532Eefe7', is_active: 1 },
    { id: 4, symbol: 'USDT_ERC20', name: 'Tether USD (ERC20)', network: 'Ethereum (ERC20)', address: '0x71C836642F4F13360565780aef863E75532Eefe7', qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=0x71C836642F4F13360565780aef863E75532Eefe7', is_active: 1 },
    { id: 5, symbol: 'SOL', name: 'Solana', network: 'Solana Mainnet', address: '7EYnhQoR9YM3N7UoaKRoA44BW8PYJuCYRnbZKWQnMMz', qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=7EYnhQoR9YM3N7UoaKRoA44BW8PYJuCYRnbZKWQnMMz', is_active: 1 },
    { id: 6, symbol: 'BNB', name: 'BNB (BEP20)', network: 'BNB Smart Chain', address: '0x71C836642F4F13360565780aef863E75532Eefe7', qr_url: 'https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=0x71C836642F4F13360565780aef863E75532Eefe7', is_active: 1 }
  ],
  email_logs: []
};

let store = JSON.parse(JSON.stringify(DEFAULT_STORE));

function loadDatabase() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf8');
      if (content && content.trim()) {
        const parsed = JSON.parse(content);
        if (parsed && Array.isArray(parsed.users)) {
          store.users = parsed.users;
          store.wallets = Array.isArray(parsed.wallets) ? parsed.wallets : [];
          store.otc_plans = Array.isArray(parsed.otc_plans) ? parsed.otc_plans : [];
          store.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
          store.company_wallets = Array.isArray(parsed.company_wallets) && parsed.company_wallets.length ? parsed.company_wallets : DEFAULT_STORE.company_wallets;
          store.email_logs = Array.isArray(parsed.email_logs) ? parsed.email_logs : [];
          return;
        }
      }
    }
  } catch (err) {}
}

function saveDatabaseSync() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const payload = JSON.stringify(store, null, 2);
    fs.writeFileSync(TEMP_FILE, payload, 'utf8');
    fs.renameSync(TEMP_FILE, DB_FILE);
    fs.writeFileSync(BACKUP_FILE, payload, 'utf8');
  } catch (err) {}
}

if (!usePostgres) {
  loadDatabase();
}

// ----------------------------------------------------
// Database Initialization
// ----------------------------------------------------
async function initDB() {
  if (usePostgres) {
    try {
      const client = await pool.connect();
      console.log('✅ [Neon PostgreSQL] Connected successfully to cloud database.');
      
      // Auto-create tables if they do not exist
      await client.query(`
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

        CREATE TABLE IF NOT EXISTS wallets (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
          exchange_balance NUMERIC(18, 2) DEFAULT 0.00,
          otc_investment_balance NUMERIC(18, 2) DEFAULT 0.00,
          accrued_profit NUMERIC(18, 2) DEFAULT 0.00,
          total_invested NUMERIC(18, 2) DEFAULT 0.00,
          updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE TABLE IF NOT EXISTS otc_plans (
          id SERIAL PRIMARY KEY,
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          tranche_name VARCHAR(150) DEFAULT 'Executive Multi-Asset Tranche',
          amount NUMERIC(18, 2) NOT NULL,
          weekly_roi_percent NUMERIC(6, 2) DEFAULT 7.50,
          duration_days INT DEFAULT 30,
          days_elapsed INT DEFAULT 0,
          profit_accrued NUMERIC(18, 2) DEFAULT 0.00,
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          start_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
          next_payout_date TIMESTAMPTZ DEFAULT NULL
        );

        CREATE TABLE IF NOT EXISTS transactions (
          id SERIAL PRIMARY KEY,
          tx_ref VARCHAR(50) NOT NULL UNIQUE,
          user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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

        CREATE TABLE IF NOT EXISTS email_logs (
          id SERIAL PRIMARY KEY,
          user_id INT DEFAULT NULL,
          recipient_email VARCHAR(191) NOT NULL,
          subject VARCHAR(255) NOT NULL,
          body TEXT NOT NULL,
          event_type VARCHAR(50) NOT NULL,
          sent_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_account_number ON users(account_number);
        CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON wallets(user_id);
        CREATE INDEX IF NOT EXISTS idx_otc_plans_user_id ON otc_plans(user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
        CREATE INDEX IF NOT EXISTS idx_transactions_tx_ref ON transactions(tx_ref);
      `);

      // Seed initial admin if missing
      const adminCheck = await client.query('SELECT id FROM users WHERE id = 1 OR role = $1 LIMIT 1', ['admin']);
      if (adminCheck.rows.length === 0) {
        console.log('🌱 [Neon PostgreSQL] Seeding initial administrator account...');
        const seededAdmin = await client.query(`
          INSERT INTO users (id, full_name, email, password_hash, country, account_number, role, status, is_verified, referral_code, kyc_status)
          VALUES (1, 'Master Administrator', 'admin@vertexcapitals.ltd', 'admin123', 'United States', 'VX-ADMIN-01', 'admin', 'active', 1, 'VX-ADMIN', 'verified')
          ON CONFLICT (email) DO NOTHING
          RETURNING id;
        `);
        const adminId = seededAdmin.rows[0]?.id || 1;
        await client.query(`
          INSERT INTO wallets (user_id, exchange_balance, otc_investment_balance, accrued_profit, total_invested)
          VALUES ($1, 100000.00, 500000.00, 85000.00, 500000.00)
          ON CONFLICT (user_id) DO NOTHING;
        `, [adminId]);
        await client.query(`
          INSERT INTO transactions (tx_ref, user_id, user_name, user_email, type, amount, asset, status, destination_address, tx_hash, notes)
          VALUES ('TX-INIT-001', $1, 'Master Administrator', 'admin@vertexcapitals.ltd', 'deposit', 100000.00, 'USDT (TRC20)', 'completed', 'Vault System', 'INITIAL-LIQUIDITY-VAULT', 'Initial Platform Reserve Liquidity')
          ON CONFLICT (tx_ref) DO NOTHING;
        `, [adminId]);
      }

      // Seed default company wallets if missing
      const cwCheck = await client.query('SELECT count(*) as count FROM company_wallets');
      if (parseInt(cwCheck.rows[0]?.count || '0', 10) === 0) {
        for (const cw of DEFAULT_STORE.company_wallets) {
          await client.query(`
            INSERT INTO company_wallets (id, symbol, name, network, address, qr_url, is_active)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            ON CONFLICT (symbol) DO NOTHING;
          `, [cw.id, cw.symbol, cw.name, cw.network, cw.address, cw.qr_url, cw.is_active]);
        }
      }

      client.release();
      return true;
    } catch (err) {
      console.error('❌ [Neon PostgreSQL Init Error]:', err.message);
      return false;
    }
  } else {
    loadDatabase();
    return true;
  }
}

// Helper: Format wallet numeric fields from Postgres strings to numbers
function formatWallet(row) {
  if (!row) return null;
  return {
    ...row,
    exchange_balance: parseFloat(row.exchange_balance || 0),
    otc_investment_balance: parseFloat(row.otc_investment_balance || 0),
    accrued_profit: parseFloat(row.accrued_profit || 0),
    total_invested: parseFloat(row.total_invested || 0)
  };
}

// Helper: Format Investment Plan Catalog
function formatInvestmentPlan(row) {
  if (!row) return null;
  return {
    ...row,
    min_amount: parseFloat(row.min_amount || 0),
    max_amount: parseFloat(row.max_amount || 0),
    roi_percentage: parseFloat(row.roi_percentage || 0),
    duration_days: parseInt(row.duration_days || 0, 10),
    active_investments_count: row.active_investments_count !== undefined ? parseInt(row.active_investments_count, 10) : undefined
  };
}

// Helper: Format OTC plan numeric fields
function formatPlan(row) {
  if (!row) return null;
  return {
    ...row,
    amount: parseFloat(row.amount || 0),
    weekly_roi_percent: parseFloat(row.weekly_roi_percent || 7.5),
    total_roi_percent: row.total_roi_percent !== null && row.total_roi_percent !== undefined ? parseFloat(row.total_roi_percent) : parseFloat(row.weekly_roi_percent || 7.5),
    total_expected_profit: row.total_expected_profit !== null && row.total_expected_profit !== undefined ? parseFloat(row.total_expected_profit) : parseFloat(row.profit_accrued || 0),
    duration_days: parseInt(row.duration_days || 30, 10),
    days_elapsed: parseInt(row.days_elapsed || 0, 10),
    profit_accrued: parseFloat(row.profit_accrued || 0)
  };
}

// Helper: Format transaction numeric fields
function formatTx(row) {
  if (!row) return null;
  return {
    ...row,
    amount: parseFloat(row.amount || 0)
  };
}

// ==========================================
// USER OPERATIONS
// ==========================================
async function findUserByEmail(email) {
  const cleanEmail = (email || '').trim().toLowerCase();
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1', [cleanEmail]);
    return res.rows[0] || null;
  }
  return store.users.find(u => (u.email || '').toLowerCase() === cleanEmail) || null;
}

async function findUserById(id) {
  const numId = parseInt(id, 10);
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM users WHERE id = $1 LIMIT 1', [numId]);
    return res.rows[0] || null;
  }
  return store.users.find(u => u.id === numId) || null;
}

async function findUserByAccountNumber(accNum) {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM users WHERE account_number = $1 LIMIT 1', [accNum]);
    return res.rows[0] || null;
  }
  return store.users.find(u => u.account_number === accNum) || null;
}

async function createUser(data) {
  const cleanEmail = (data.email || '').trim().toLowerCase();
  const fullName = (data.full_name || '').trim();
  const passwordHash = data.password_hash || 'user123';
  const country = data.country || 'United States';
  const accNum = data.account_number || ('VX-' + Math.floor(1000 + Math.random() * 9000));
  const role = data.role || 'user';
  const status = data.status || 'active';
  const verificationCode = data.verification_code || null;
  const isVerified = data.is_verified ? 1 : 0;
  const refCode = data.referral_code || `VX-${accNum}`;
  const referredBy = data.referred_by || null;
  const kycStatus = data.kyc_status || 'unverified';

  if (usePostgres) {
    const res = await pool.query(`
      INSERT INTO users (
        full_name, email, password_hash, country, account_number, role,
        status, verification_code, is_verified, referral_code, referred_by, kyc_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *;
    `, [
      fullName, cleanEmail, passwordHash, country, accNum, role,
      status, verificationCode, isVerified, refCode, referredBy, kycStatus
    ]);
    return res.rows[0];
  }

  const nextId = store.users.length ? Math.max(...store.users.map(u => u.id || 0)) + 1 : 1;
  const newUser = {
    id: nextId,
    full_name: fullName,
    email: cleanEmail,
    password_hash: passwordHash,
    country,
    account_number: accNum,
    role,
    status,
    verification_code: verificationCode,
    is_verified: isVerified,
    referral_code: refCode,
    referred_by: referredBy,
    kyc_status: kycStatus,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  store.users.push(newUser);
  saveDatabaseSync();
  return newUser;
}

async function updateUser(id, updates) {
  const numId = parseInt(id, 10);
  if (usePostgres) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return findUserById(numId);

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key of keys) {
      setClauses.push(`${key} = $${idx}`);
      values.push(updates[key]);
      idx++;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(numId);

    const query = `
      UPDATE users
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await pool.query(query, values);
    return res.rows[0] || null;
  }

  const user = store.users.find(u => u.id === numId);
  if (user) {
    Object.assign(user, updates, { updated_at: new Date().toISOString() });
    saveDatabaseSync();
    return user;
  }
  return null;
}

async function getAllUsers() {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM users ORDER BY id DESC');
    return res.rows;
  }
  return [...store.users].reverse();
}

async function deleteUser(id) {
  const numId = parseInt(id, 10);
  if (usePostgres) {
    // Soft deletion: deactivates account and marks as deleted while preserving all financial transactions and history
    const res = await pool.query(
      "UPDATE users SET status = 'deleted', updated_at = NOW() WHERE id = $1 RETURNING *",
      [numId]
    );
    return res.rowCount > 0;
  }

  const user = store.users.find(u => u.id === numId);
  if (user) {
    user.status = 'deleted';
    user.updated_at = new Date().toISOString();
    saveDatabaseSync();
    return true;
  }
  return false;
}

// ==========================================
// WALLET OPERATIONS
// ==========================================
async function getWalletByUserId(userId) {
  const numId = parseInt(userId, 10);
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM wallets WHERE user_id = $1 LIMIT 1', [numId]);
    if (res.rows[0]) {
      return formatWallet(res.rows[0]);
    }
    // Auto-create wallet if missing
    const created = await pool.query(`
      INSERT INTO wallets (user_id, exchange_balance, otc_investment_balance, accrued_profit, total_invested)
      VALUES ($1, 0.00, 0.00, 0.00, 0.00)
      ON CONFLICT (user_id) DO UPDATE SET updated_at = NOW()
      RETURNING *;
    `, [numId]);
    return formatWallet(created.rows[0]);
  }

  let wallet = store.wallets.find(w => w.user_id === numId);
  if (!wallet) {
    wallet = {
      id: store.wallets.length ? Math.max(...store.wallets.map(w => w.id || 0)) + 1 : 1,
      user_id: numId,
      exchange_balance: 0.00,
      otc_investment_balance: 0.00,
      accrued_profit: 0.00,
      total_invested: 0.00,
      updated_at: new Date().toISOString()
    };
    store.wallets.push(wallet);
    saveDatabaseSync();
  }
  return wallet;
}

async function createWallet(data) {
  const numId = parseInt(data.user_id, 10);
  const exchangeBalance = parseFloat(data.exchange_balance || 0);
  const otcBalance = parseFloat(data.otc_investment_balance || 0);
  const accruedProfit = parseFloat(data.accrued_profit || 0);
  const totalInvested = parseFloat(data.total_invested || 0);

  if (usePostgres) {
    const res = await pool.query(`
      INSERT INTO wallets (user_id, exchange_balance, otc_investment_balance, accrued_profit, total_invested)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (user_id) DO UPDATE SET
        exchange_balance = EXCLUDED.exchange_balance,
        otc_investment_balance = EXCLUDED.otc_investment_balance,
        accrued_profit = EXCLUDED.accrued_profit,
        total_invested = EXCLUDED.total_invested,
        updated_at = NOW()
      RETURNING *;
    `, [numId, exchangeBalance, otcBalance, accruedProfit, totalInvested]);
    return formatWallet(res.rows[0]);
  }

  let wallet = store.wallets.find(w => w.user_id === numId);
  if (!wallet) {
    wallet = {
      id: store.wallets.length ? Math.max(...store.wallets.map(w => w.id || 0)) + 1 : 1,
      user_id: numId,
      exchange_balance: exchangeBalance,
      otc_investment_balance: otcBalance,
      accrued_profit: accruedProfit,
      total_invested: totalInvested,
      updated_at: new Date().toISOString()
    };
    store.wallets.push(wallet);
  } else {
    Object.assign(wallet, data, { updated_at: new Date().toISOString() });
  }
  saveDatabaseSync();
  return wallet;
}

async function updateWallet(userId, updates, client = null) {
  const numId = parseInt(userId, 10);
  const dbExecutor = client || pool;
  if (usePostgres) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return getWalletByUserId(numId, client);

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key of keys) {
      setClauses.push(`${key} = $${idx}`);
      values.push(updates[key]);
      idx++;
    }

    setClauses.push(`updated_at = NOW()`);
    values.push(numId);

    const query = `
      UPDATE wallets
      SET ${setClauses.join(', ')}
      WHERE user_id = $${idx}
      RETURNING *;
    `;
    const res = await dbExecutor.query(query, values);
    return formatWallet(res.rows[0]) || null;
  }

  let wallet = await getWalletByUserId(numId);
  if (wallet) {
    Object.assign(wallet, updates, { updated_at: new Date().toISOString() });
    saveDatabaseSync();
    return wallet;
  }
  return null;
}

/**
 * Atomic Wallet Balance Adjustment
 * Protects against race conditions and concurrent double-spending by utilizing
 * atomic database level arithmetic and row checks (e.g., balance = balance + $1).
 */
async function adjustWalletBalance(userId, { exchangeDelta = 0, otcDelta = 0, profitDelta = 0, investedDelta = 0 }, client = null) {
  const numId = parseInt(userId, 10);
  const dbExecutor = client || pool;

  if (usePostgres) {
    const res = await dbExecutor.query(`
      UPDATE wallets
      SET 
        exchange_balance = exchange_balance + $1,
        otc_investment_balance = otc_investment_balance + $2,
        accrued_profit = accrued_profit + $3,
        total_invested = total_invested + $4,
        updated_at = NOW()
      WHERE user_id = $5 AND (exchange_balance + $1) >= 0
      RETURNING *;
    `, [exchangeDelta, otcDelta, profitDelta, investedDelta, numId]);

    if (res.rows.length === 0) {
      throw new Error('Insufficient wallet balance or wallet not found');
    }
    return formatWallet(res.rows[0]);
  }

  // Fallback
  let wallet = await getWalletByUserId(numId);
  if (!wallet) throw new Error('Wallet not found');
  if (wallet.exchange_balance + exchangeDelta < 0) {
    throw new Error('Insufficient wallet balance');
  }
  wallet.exchange_balance = parseFloat((wallet.exchange_balance + exchangeDelta).toFixed(2));
  wallet.otc_investment_balance = parseFloat((wallet.otc_investment_balance + otcDelta).toFixed(2));
  wallet.accrued_profit = parseFloat((wallet.accrued_profit + profitDelta).toFixed(2));
  wallet.total_invested = parseFloat((wallet.total_invested + investedDelta).toFixed(2));
  wallet.updated_at = new Date().toISOString();
  saveDatabaseSync();
  return wallet;
}

/**
 * Execute a function within a strict PostgreSQL Transaction
 */
async function withTransaction(callback) {
  if (usePostgres && pool) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  } else {
    return callback(null);
  }
}

async function getAllWallets() {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM wallets ORDER BY id ASC');
    return res.rows.map(formatWallet);
  }
  return store.wallets;
}

// ==========================================
// OTC PLAN OPERATIONS
// ==========================================
async function getOtcPlanByUserId(userId) {
  const numId = parseInt(userId, 10);
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM otc_plans WHERE user_id = $1 AND status = $2 ORDER BY id DESC LIMIT 1', [numId, 'active']);
    return formatPlan(res.rows[0]) || null;
  }
  return store.otc_plans.filter(p => p.user_id === numId && p.status === 'active').sort((a, b) => b.id - a.id)[0] || null;
}

async function getOtcPlansByUserId(userId) {
  const numId = parseInt(userId, 10);
  if (usePostgres) {
    const res = await pool.query(`
      SELECT op.*, ip.category AS plan_category, ip.name AS catalog_plan_name
      FROM otc_plans op
      LEFT JOIN investment_plans ip ON op.plan_id = ip.id
      WHERE op.user_id = $1
      ORDER BY op.id DESC
    `, [numId]);
    return res.rows.map(row => {
      const formatted = formatPlan(row);
      return {
        ...formatted,
        category: row.plan_category || (row.duration_days <= 30 ? 'Short-Term' : 'Long-Term')
      };
    });
  }
  return store.otc_plans.filter(p => p.user_id === numId).map(p => ({
    ...formatPlan(p),
    category: p.duration_days <= 30 ? 'Short-Term' : 'Long-Term'
  }));
}

async function createOtcPlan(data, client = null) {
  const numId = parseInt(data.user_id, 10);
  const planId = data.plan_id ? parseInt(data.plan_id, 10) : null;
  const trancheName = data.tranche_name || 'Executive Multi-Asset Tranche';
  const amount = parseFloat(data.amount || 0);
  const weeklyRoi = parseFloat(data.weekly_roi_percent || 7.5);
  const totalRoi = data.total_roi_percent !== undefined ? parseFloat(data.total_roi_percent) : weeklyRoi;
  const totalExpectedProfit = data.total_expected_profit !== undefined ? parseFloat(data.total_expected_profit) : parseFloat((amount * (totalRoi / 100)).toFixed(2));
  const durationDays = parseInt(data.duration_days || 30, 10);
  const daysElapsed = parseInt(data.days_elapsed || 0, 10);
  const profitAccrued = parseFloat(data.profit_accrued || 0);
  const status = data.status || 'active';
  const startDate = data.start_date || new Date().toISOString();
  const endDate = data.end_date || new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
  const dbExecutor = client || pool;

  if (usePostgres) {
    const res = await dbExecutor.query(`
      INSERT INTO otc_plans (
        user_id, plan_id, tranche_name, amount, weekly_roi_percent, total_roi_percent,
        total_expected_profit, duration_days, days_elapsed, profit_accrued, status,
        start_date, end_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *;
    `, [numId, planId, trancheName, amount, weeklyRoi, totalRoi, totalExpectedProfit, durationDays, daysElapsed, profitAccrued, status, startDate, endDate]);
    return formatPlan(res.rows[0]);
  }

  const newPlan = {
    id: store.otc_plans.length ? Math.max(...store.otc_plans.map(p => p.id || 0)) + 1 : Date.now(),
    user_id: numId,
    plan_id: planId,
    tranche_name: trancheName,
    amount,
    weekly_roi_percent: weeklyRoi,
    total_roi_percent: totalRoi,
    total_expected_profit: totalExpectedProfit,
    duration_days: durationDays,
    days_elapsed: daysElapsed,
    profit_accrued: profitAccrued,
    status,
    created_at: new Date().toISOString(),
    start_date: startDate,
    end_date: endDate
  };
  store.otc_plans.push(newPlan);
  saveDatabaseSync();
  return newPlan;
}

async function updateOtcPlan(id, updates, client = null) {
  const numId = parseInt(id, 10);
  const dbExecutor = client || pool;
  if (usePostgres) {
    const keys = Object.keys(updates);
    if (keys.length === 0) {
      const res = await dbExecutor.query('SELECT * FROM otc_plans WHERE id = $1 LIMIT 1', [numId]);
      return formatPlan(res.rows[0]) || null;
    }

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key of keys) {
      setClauses.push(`${key} = $${idx}`);
      values.push(updates[key]);
      idx++;
    }
    values.push(numId);

    const query = `
      UPDATE otc_plans
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await dbExecutor.query(query, values);
    return formatPlan(res.rows[0]) || null;
  }

  const plan = store.otc_plans.find(p => p.id === numId);
  if (plan) {
    Object.assign(plan, updates);
    saveDatabaseSync();
    return plan;
  }
  return null;
}

async function getAllOtcPlans() {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM otc_plans ORDER BY id DESC');
    return res.rows.map(formatPlan);
  }
  return store.otc_plans;
}

async function deleteOtcPlan(id) {
  const numId = parseInt(id, 10);
  if (usePostgres) {
    const res = await pool.query('DELETE FROM otc_plans WHERE id = $1', [numId]);
    return res.rowCount > 0;
  }

  const idx = store.otc_plans.findIndex(p => p.id === numId);
  if (idx !== -1) {
    store.otc_plans.splice(idx, 1);
    saveDatabaseSync();
    return true;
  }
  return false;
}

// ==========================================
// INVESTMENT PLAN CATALOG OPERATIONS
// ==========================================
async function getAllInvestmentPlans(includeInactive = false) {
  if (usePostgres) {
    let sql = `
      SELECT p.*, 
        COUNT(o.id) FILTER (WHERE o.status = 'active') AS active_investments_count
      FROM investment_plans p
      LEFT JOIN otc_plans o ON o.plan_id = p.id
    `;
    if (!includeInactive) {
      sql += ` WHERE p.status = 'active' `;
    } else {
      sql += ` WHERE p.status != 'archived' `;
    }
    sql += ` GROUP BY p.id ORDER BY p.id ASC`;
    const res = await pool.query(sql);
    return res.rows.map(formatInvestmentPlan);
  }

  // Fallback in-memory
  if (!store.investment_plans) {
    store.investment_plans = [];
  }
  return store.investment_plans
    .filter(p => includeInactive ? p.status !== 'archived' : p.status === 'active')
    .map(formatInvestmentPlan);
}

async function getInvestmentPlanById(id) {
  const numId = parseInt(id, 10);
  if (usePostgres) {
    const res = await pool.query(`
      SELECT p.*,
        COUNT(o.id) FILTER (WHERE o.status = 'active') AS active_investments_count
      FROM investment_plans p
      LEFT JOIN otc_plans o ON o.plan_id = p.id
      WHERE p.id = $1
      GROUP BY p.id
      LIMIT 1
    `, [numId]);
    return formatInvestmentPlan(res.rows[0]) || null;
  }
  if (!store.investment_plans) store.investment_plans = [];
  const plan = store.investment_plans.find(p => p.id === numId);
  return formatInvestmentPlan(plan) || null;
}

async function createInvestmentPlan(data, client = null) {
  const name = (data.name || '').trim();
  const description = data.description || '';
  const category = data.category === 'Long-Term' ? 'Long-Term' : 'Short-Term';
  const minAmount = parseFloat(data.min_amount || 100);
  const maxAmount = parseFloat(data.max_amount || 100000);
  const roiPercentage = parseFloat(data.roi_percentage || 10);
  const durationDays = parseInt(data.duration_days || 30, 10);
  const status = data.status === 'inactive' ? 'inactive' : 'active';
  const displayIcon = data.display_icon || (category === 'Short-Term' ? 'zap' : 'shield');
  const dbExecutor = client || pool;

  if (usePostgres) {
    const res = await dbExecutor.query(`
      INSERT INTO investment_plans (
        name, description, category, min_amount, max_amount,
        roi_percentage, duration_days, status, display_icon
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *;
    `, [name, description, category, minAmount, maxAmount, roiPercentage, durationDays, status, displayIcon]);
    return formatInvestmentPlan(res.rows[0]);
  }

  if (!store.investment_plans) store.investment_plans = [];
  const newPlan = {
    id: store.investment_plans.length ? Math.max(...store.investment_plans.map(p => p.id || 0)) + 1 : 1,
    name,
    description,
    category,
    min_amount: minAmount,
    max_amount: maxAmount,
    roi_percentage: roiPercentage,
    duration_days: durationDays,
    status,
    display_icon: displayIcon,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
  store.investment_plans.push(newPlan);
  saveDatabaseSync();
  return newPlan;
}

async function updateInvestmentPlan(id, updates, client = null) {
  const numId = parseInt(id, 10);
  const dbExecutor = client || pool;
  if (usePostgres) {
    const allowed = ['name', 'description', 'category', 'min_amount', 'max_amount', 'roi_percentage', 'duration_days', 'status', 'display_icon'];
    const keys = Object.keys(updates).filter(k => allowed.includes(k));
    if (keys.length === 0) return getInvestmentPlanById(numId);

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key of keys) {
      setClauses.push(`${key} = $${idx}`);
      values.push(updates[key]);
      idx++;
    }
    setClauses.push(`updated_at = NOW()`);
    values.push(numId);

    const query = `
      UPDATE investment_plans
      SET ${setClauses.join(', ')}
      WHERE id = $${idx}
      RETURNING *;
    `;
    const res = await dbExecutor.query(query, values);
    return formatInvestmentPlan(res.rows[0]) || null;
  }

  if (!store.investment_plans) store.investment_plans = [];
  const plan = store.investment_plans.find(p => p.id === numId);
  if (plan) {
    Object.assign(plan, updates, { updated_at: new Date().toISOString() });
    saveDatabaseSync();
    return plan;
  }
  return null;
}

async function deleteInvestmentPlan(id) {
  const numId = parseInt(id, 10);
  if (usePostgres) {
    // Check if any customer investments are currently attached to this plan
    const checkRes = await pool.query('SELECT COUNT(*) FROM otc_plans WHERE plan_id = $1', [numId]);
    const attachedCount = parseInt(checkRes.rows[0].count, 10);

    if (attachedCount > 0) {
      // Non-destructive: archive/deactivate plan to protect existing customer contract terms
      await pool.query("UPDATE investment_plans SET status = 'archived', updated_at = NOW() WHERE id = $1", [numId]);
      return { archived: true, message: 'Plan has active investments and was safely archived rather than deleted.' };
    }

    const res = await pool.query('DELETE FROM investment_plans WHERE id = $1', [numId]);
    return { deleted: res.rowCount > 0 };
  }

  if (!store.investment_plans) store.investment_plans = [];
  const idx = store.investment_plans.findIndex(p => p.id === numId);
  if (idx !== -1) {
    store.investment_plans.splice(idx, 1);
    saveDatabaseSync();
    return { deleted: true };
  }
  return { deleted: false };
}

// ==========================================
// TRANSACTION OPERATIONS
// ==========================================
async function createTransaction(data, client = null) {
  const numId = parseInt(data.user_id, 10);
  const txRef = data.tx_ref || ('TX-' + Math.floor(100000 + Math.random() * 900000));
  const userName = data.user_name || null;
  const userEmail = data.user_email || null;
  const type = data.type || 'deposit';
  const amount = parseFloat(data.amount || 0);
  const asset = data.asset || 'USD';
  const status = data.status || 'pending';
  const destinationAddress = data.destination_address || null;
  const txHash = data.tx_hash || null;
  const notes = data.notes || null;
  const dbExecutor = client || pool;

  if (usePostgres) {
    const res = await dbExecutor.query(`
      INSERT INTO transactions (
        tx_ref, user_id, user_name, user_email, type, amount,
        asset, status, destination_address, tx_hash, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *;
    `, [txRef, numId, userName, userEmail, type, amount, asset, status, destinationAddress, txHash, notes]);
    return formatTx(res.rows[0]);
  }

  const newTx = {
    id: store.transactions.length ? Math.max(...store.transactions.map(t => t.id || 0)) + 1 : 1,
    tx_ref: txRef,
    user_id: numId,
    user_name: userName,
    user_email: userEmail,
    type,
    amount,
    asset,
    status,
    destination_address: destinationAddress,
    tx_hash: txHash,
    notes,
    created_at: new Date().toISOString()
  };
  store.transactions.unshift(newTx);
  saveDatabaseSync();
  return newTx;
}

async function getTransactionsByUserId(userId) {
  const numId = parseInt(userId, 10);
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM transactions WHERE user_id = $1 ORDER BY id DESC', [numId]);
    return res.rows.map(formatTx);
  }
  return store.transactions.filter(t => t.user_id === numId);
}

async function getTransactionByRef(txRef) {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM transactions WHERE tx_ref = $1 LIMIT 1', [txRef]);
    return formatTx(res.rows[0]) || null;
  }
  return store.transactions.find(t => t.tx_ref === txRef) || null;
}

async function updateTransaction(txRef, updates, client = null) {
  const dbExecutor = client || pool;
  if (usePostgres) {
    const keys = Object.keys(updates);
    if (keys.length === 0) return getTransactionByRef(txRef);

    const setClauses = [];
    const values = [];
    let idx = 1;

    for (const key of keys) {
      setClauses.push(`${key} = $${idx}`);
      values.push(updates[key]);
      idx++;
    }
    values.push(txRef);

    const query = `
      UPDATE transactions
      SET ${setClauses.join(', ')}
      WHERE tx_ref = $${idx}
      RETURNING *;
    `;
    const res = await dbExecutor.query(query, values);
    return formatTx(res.rows[0]) || null;
  }

  const tx = store.transactions.find(t => t.tx_ref === txRef);
  if (tx) {
    Object.assign(tx, updates);
    saveDatabaseSync();
    return tx;
  }
  return null;
}

async function getAllTransactions() {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM transactions ORDER BY id DESC');
    return res.rows.map(formatTx);
  }
  return store.transactions;
}

async function deleteTransaction(txRef) {
  if (usePostgres) {
    const res = await pool.query('DELETE FROM transactions WHERE tx_ref = $1', [txRef]);
    return res.rowCount > 0;
  }

  const idx = store.transactions.findIndex(t => t.tx_ref === txRef);
  if (idx !== -1) {
    store.transactions.splice(idx, 1);
    saveDatabaseSync();
    return true;
  }
  return false;
}

// ==========================================
// COMPANY WALLET OPERATIONS
// ==========================================
async function getCompanyWallets() {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM company_wallets ORDER BY id ASC');
    return res.rows;
  }
  return store.company_wallets;
}

async function saveCompanyWallet(data) {
  const sym = (data.symbol || '').trim();
  const name = (data.name || sym).trim();
  const network = (data.network || 'Mainnet').trim();
  const address = (data.address || '').trim();
  const qrUrl = data.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(address)}`;
  const isActive = (data.is_active === 0 || data.is_active === false || data.is_active === '0') ? 0 : 1;

  if (usePostgres) {
    const res = await pool.query(`
      INSERT INTO company_wallets (symbol, name, network, address, qr_url, is_active, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      ON CONFLICT (symbol) DO UPDATE SET
        name = EXCLUDED.name,
        network = EXCLUDED.network,
        address = EXCLUDED.address,
        qr_url = EXCLUDED.qr_url,
        is_active = EXCLUDED.is_active,
        updated_at = NOW()
      RETURNING *;
    `, [sym, name, network, address, qrUrl, isActive]);
    return res.rows[0];
  }

  let cw = store.company_wallets.find(w => (w.symbol || '').toUpperCase() === sym.toUpperCase());
  if (cw) {
    Object.assign(cw, { name, network, address, qr_url: qrUrl, is_active: isActive });
  } else {
    cw = {
      id: store.company_wallets.length ? Math.max(...store.company_wallets.map(w => w.id || 0)) + 1 : 1,
      symbol: sym,
      name,
      network,
      address,
      qr_url: qrUrl,
      is_active: isActive
    };
    store.company_wallets.push(cw);
  }
  saveDatabaseSync();
  return cw;
}

async function deleteCompanyWallet(symbol) {
  const sym = (symbol || '').trim();
  if (usePostgres) {
    const res = await pool.query('DELETE FROM company_wallets WHERE UPPER(symbol) = UPPER($1)', [sym]);
    return res.rowCount > 0;
  }

  const idx = store.company_wallets.findIndex(w => (w.symbol || '').toUpperCase() === sym.toUpperCase());
  if (idx !== -1) {
    store.company_wallets.splice(idx, 1);
    saveDatabaseSync();
    return true;
  }
  return false;
}

// ==========================================
// EMAIL LOG OPERATIONS
// ==========================================
async function logEmail(data) {
  const userId = data.userId || data.user_id || null;
  const recipientEmail = data.to || data.recipient_email;
  const subject = data.subject || '';
  const body = data.html || data.text || data.body || '';
  const eventType = data.eventType || data.event_type || 'general';

  if (usePostgres) {
    const res = await pool.query(`
      INSERT INTO email_logs (user_id, recipient_email, subject, body, event_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *;
    `, [userId, recipientEmail, subject, body, eventType]);
    return res.rows[0];
  }

  const newLog = {
    id: store.email_logs.length ? Math.max(...store.email_logs.map(l => l.id || 0)) + 1 : 1,
    user_id: userId,
    recipient_email: recipientEmail,
    subject,
    body,
    event_type: eventType,
    sent_at: new Date().toISOString()
  };
  store.email_logs.unshift(newLog);
  if (store.email_logs.length > 500) store.email_logs.length = 500;
  saveDatabaseSync();
  return newLog;
}

async function getEmailLogs() {
  if (usePostgres) {
    const res = await pool.query('SELECT * FROM email_logs ORDER BY id DESC LIMIT 500');
    return res.rows;
  }
  return store.email_logs;
}

async function clearEmailLogs() {
  if (usePostgres) {
    await pool.query('TRUNCATE TABLE email_logs RESTART IDENTITY');
    return true;
  }
  store.email_logs = [];
  saveDatabaseSync();
  return true;
}

module.exports = {
  init: initDB,
  initDB,
  isPostgres: () => usePostgres,
  isMySQL: () => false,

  // User operations
  findUserByEmail,
  findUserById,
  findUserByAccountNumber,
  createUser,
  updateUser,
  getAllUsers,
  deleteUser,

  // Wallet operations
  getWalletByUserId,
  createWallet,
  updateWallet,
  adjustWalletBalance,
  withTransaction,
  getAllWallets,

  // OTC Plan operations
  getOtcPlanByUserId,
  getOtcPlansByUserId,
  createOtcPlan,
  updateOtcPlan,
  getAllOtcPlans,
  deleteOtcPlan,

  // Transaction operations
  createTransaction,
  getTransactionsByUserId,
  getTransactionByRef,
  updateTransaction,
  getAllTransactions,
  deleteTransaction,

  // Company Wallet operations
  getCompanyWallets,
  saveCompanyWallet,
  deleteCompanyWallet,

  // Email Log operations
  logEmail,
  getEmailLogs,
  clearEmailLogs,

  // Investment Plan Catalog operations
  getAllInvestmentPlans,
  getInvestmentPlanById,
  createInvestmentPlan,
  updateInvestmentPlan,
  deleteInvestmentPlan,

  // Pool access & store
  pool,
  store,
  saveDatabaseSync,
  loadDatabase
};
