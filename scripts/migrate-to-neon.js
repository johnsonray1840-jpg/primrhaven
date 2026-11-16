/**
 * VertexCapitals Data Migration Script
 * Migrates existing data from data/vertex_platform.db.json into Neon PostgreSQL.
 * Run with: DATABASE_URL="your-neon-url" node scripts/migrate-to-neon.js
 */

const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

if (!connectionString) {
  console.error('❌ Error: DATABASE_URL environment variable is missing.');
  console.error('Usage: DATABASE_URL="postgresql://user:pass@ep-xyz.neon.tech/neondb?sslmode=require" node scripts/migrate-to-neon.js');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const JSON_FILE = path.join(__dirname, '..', 'data', 'vertex_platform.db.json');

async function migrate() {
  console.log('🚀 Starting migration to Neon PostgreSQL...');

  if (!fs.existsSync(JSON_FILE)) {
    console.error(`❌ Data file not found at: ${JSON_FILE}`);
    process.exit(1);
  }

  const raw = fs.readFileSync(JSON_FILE, 'utf8');
  const data = JSON.parse(raw);

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Ensure tables exist
    console.log('1️⃣ Ensuring database tables and indexes exist...');
    const schemaSql = fs.readFileSync(path.join(__dirname, '..', 'schema-pg.sql'), 'utf8');
    await client.query(schemaSql);

    // 2. Migrate Users
    console.log(`2️⃣ Migrating ${data.users?.length || 0} users...`);
    for (const u of (data.users || [])) {
      await client.query(`
        INSERT INTO users (
          id, full_name, email, password_hash, country, account_number, role,
          status, verification_code, is_verified, referral_code, referred_by,
          kyc_status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          email = EXCLUDED.email,
          password_hash = EXCLUDED.password_hash,
          country = EXCLUDED.country,
          account_number = EXCLUDED.account_number,
          role = EXCLUDED.role,
          status = EXCLUDED.status,
          verification_code = EXCLUDED.verification_code,
          is_verified = EXCLUDED.is_verified,
          referral_code = EXCLUDED.referral_code,
          referred_by = EXCLUDED.referred_by,
          kyc_status = EXCLUDED.kyc_status,
          updated_at = EXCLUDED.updated_at;
      `, [
        u.id, u.full_name, (u.email || '').toLowerCase().trim(), u.password_hash,
        u.country || 'United States', u.account_number, u.role || 'user',
        u.status || 'active', u.verification_code || null, u.is_verified ? 1 : 0,
        u.referral_code, u.referred_by || null, u.kyc_status || 'unverified',
        u.created_at || new Date(), u.updated_at || new Date()
      ]);
    }

    // Reset user sequence
    await client.query(`SELECT setval('users_id_seq', (SELECT COALESCE(MAX(id), 1) FROM users));`);

    // 3. Migrate Wallets
    console.log(`3️⃣ Migrating ${data.wallets?.length || 0} wallets...`);
    for (const w of (data.wallets || [])) {
      await client.query(`
        INSERT INTO wallets (
          id, user_id, exchange_balance, otc_investment_balance, accrued_profit,
          total_invested, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (user_id) DO UPDATE SET
          exchange_balance = EXCLUDED.exchange_balance,
          otc_investment_balance = EXCLUDED.otc_investment_balance,
          accrued_profit = EXCLUDED.accrued_profit,
          total_invested = EXCLUDED.total_invested,
          updated_at = EXCLUDED.updated_at;
      `, [
        w.id, w.user_id, parseFloat(w.exchange_balance || 0),
        parseFloat(w.otc_investment_balance || 0), parseFloat(w.accrued_profit || 0),
        parseFloat(w.total_invested || 0), w.updated_at || new Date()
      ]);
    }
    await client.query(`SELECT setval('wallets_id_seq', (SELECT COALESCE(MAX(id), 1) FROM wallets));`);

    // 4. Migrate OTC Plans
    console.log(`4️⃣ Migrating ${data.otc_plans?.length || 0} OTC plans...`);
    for (const p of (data.otc_plans || [])) {
      await client.query(`
        INSERT INTO otc_plans (
          id, user_id, tranche_name, amount, weekly_roi_percent, duration_days,
          days_elapsed, profit_accrued, status, created_at, start_date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          tranche_name = EXCLUDED.tranche_name,
          amount = EXCLUDED.amount,
          weekly_roi_percent = EXCLUDED.weekly_roi_percent,
          duration_days = EXCLUDED.duration_days,
          days_elapsed = EXCLUDED.days_elapsed,
          profit_accrued = EXCLUDED.profit_accrued,
          status = EXCLUDED.status;
      `, [
        p.id, p.user_id, p.tranche_name || 'Executive Multi-Asset Tranche',
        parseFloat(p.amount || 0), parseFloat(p.weekly_roi_percent || 7.5),
        parseInt(p.duration_days || 30, 10), parseInt(p.days_elapsed || 0, 10),
        parseFloat(p.profit_accrued || 0), p.status || 'active',
        p.created_at || new Date(), p.start_date || new Date()
      ]);
    }
    await client.query(`SELECT setval('otc_plans_id_seq', (SELECT COALESCE(MAX(id), 1) FROM otc_plans));`);

    // 5. Migrate Transactions
    console.log(`5️⃣ Migrating ${data.transactions?.length || 0} transactions...`);
    for (const t of (data.transactions || [])) {
      await client.query(`
        INSERT INTO transactions (
          id, tx_ref, user_id, user_name, user_email, type, amount,
          asset, status, destination_address, tx_hash, notes, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        ON CONFLICT (tx_ref) DO UPDATE SET
          status = EXCLUDED.status,
          notes = EXCLUDED.notes;
      `, [
        t.id, t.tx_ref, t.user_id, t.user_name || null, t.user_email || null,
        t.type || 'deposit', parseFloat(t.amount || 0), t.asset || 'USDT',
        t.status || 'completed', t.destination_address || null, t.tx_hash || null,
        t.notes || null, t.created_at || new Date()
      ]);
    }
    await client.query(`SELECT setval('transactions_id_seq', (SELECT COALESCE(MAX(id), 1) FROM transactions));`);

    // 6. Migrate Company Wallets
    console.log(`6️⃣ Migrating ${data.company_wallets?.length || 0} company wallets...`);
    for (const cw of (data.company_wallets || [])) {
      await client.query(`
        INSERT INTO company_wallets (
          id, symbol, name, network, address, qr_url, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (symbol) DO UPDATE SET
          name = EXCLUDED.name,
          network = EXCLUDED.network,
          address = EXCLUDED.address,
          qr_url = EXCLUDED.qr_url,
          is_active = EXCLUDED.is_active,
          updated_at = NOW();
      `, [
        cw.id, cw.symbol, cw.name, cw.network, cw.address,
        cw.qr_url || null, cw.is_active ? 1 : 0
      ]);
    }
    await client.query(`SELECT setval('company_wallets_id_seq', (SELECT COALESCE(MAX(id), 1) FROM company_wallets));`);

    await client.query('COMMIT');
    console.log('🎉 Migration completed successfully! All records safely transferred.');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed and was rolled back:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

migrate();
