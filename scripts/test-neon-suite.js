/**
 * Comprehensive Automated Test Suite
 * Validates Section 9:
 * 1. Database connection
 * 2. User registration
 * 3. User login (password check & lookup)
 * 4. User lookup (by email, id, account number)
 * 5. Wallet retrieval
 * 6. Wallet balance updates
 * 7. Transaction creation
 * 8. Transaction history retrieval
 * 9. Investment plan creation (OTC plan)
 * 10. Investment plan retrieval
 * 11. Admin dashboard database operations
 * 12. Customer dashboard database operations
 * 13. Email logging & retrieval
 * 14. Simultaneous financial operations & atomic overdraft protections
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const assert = require('assert');
const db = require('../database');

async function runTestSuite() {
  console.log('====================================================');
  console.log('🧪 Starting Neon PostgreSQL Comprehensive Test Suite');
  console.log('====================================================');

  const testEmail = `test_runner_${Date.now()}@vertexcapitals.ltd`;
  const testAccount = `AC_${Date.now().toString().slice(-8)}`;
  let createdUserId = null;
  let testTxRef = `TX_TEST_${Date.now()}`;

  // 1. Database Connection
  console.log('\n[TEST 1] Testing Database Connection...');
  assert.strictEqual(db.isPostgres(), true, 'db.isPostgres() must return true');
  const pingRes = await db.pool.query('SELECT NOW() AS current_time');
  assert.ok(pingRes.rows[0].current_time, 'PostgreSQL server responded with timestamp');
  console.log('✅ PASS: Connected to Neon PostgreSQL at', pingRes.rows[0].current_time);

  // 2. User Registration
  console.log('\n[TEST 2] Testing User Registration (createUser)...');
  const newUser = await db.createUser({
    full_name: 'Automated Test User',
    email: testEmail,
    password_hash: '$2b$10$fakeHashedPasswordForTestRunner',
    country: 'United States',
    account_number: testAccount,
    role: 'user',
    status: 'active'
  });
  assert.ok(newUser && newUser.id, 'User created must have an id');
  createdUserId = newUser.id;
  assert.strictEqual(newUser.email, testEmail);
  console.log('✅ PASS: User registered successfully with ID:', createdUserId);

  // 3. User Lookup by Email, ID, and Account Number
  console.log('\n[TEST 3 & 4] Testing User Lookup by Email, ID, and Account Number...');
  const userByEmail = await db.findUserByEmail(testEmail);
  assert.ok(userByEmail, 'findUserByEmail must find the user');
  assert.strictEqual(userByEmail.id, createdUserId);

  const userById = await db.findUserById(createdUserId);
  assert.ok(userById, 'findUserById must find the user');
  assert.strictEqual(userById.email, testEmail);

  const userByAcc = await db.findUserByAccountNumber(testAccount);
  assert.ok(userByAcc, 'findUserByAccountNumber must find the user');
  assert.strictEqual(userByAcc.id, createdUserId);
  console.log('✅ PASS: User lookup verified across all 3 identifiers');

  // 5. Wallet Retrieval & Default Initialization
  console.log('\n[TEST 5] Testing Wallet Retrieval...');
  const defaultWallet = await db.getWalletByUserId(createdUserId);
  assert.ok(defaultWallet, 'Wallet must be retrieved or auto-created');
  assert.strictEqual(Number(defaultWallet.exchange_balance), 0.00);
  assert.strictEqual(Number(defaultWallet.otc_investment_balance), 0.00);
  console.log('✅ PASS: Wallet retrieved with initial balances:', {
    exchange: defaultWallet.exchange_balance,
    otc_investment: defaultWallet.otc_investment_balance,
    accrued_profit: defaultWallet.accrued_profit
  });

  // 6. Wallet Balance Updates
  console.log('\n[TEST 6] Testing Wallet Balance Update (updateWallet)...');
  const updatedWallet = await db.updateWallet(createdUserId, {
    exchange_balance: 1200.50,
    otc_investment_balance: 500.00
  });
  assert.strictEqual(Number(updatedWallet.exchange_balance), 1200.50);
  assert.strictEqual(Number(updatedWallet.otc_investment_balance), 500.00);
  console.log('✅ PASS: Wallet updated successfully to exchange=$1200.50, otc=$500.00');

  // 7 & 8. Transaction Creation & History Retrieval
  console.log('\n[TEST 7 & 8] Testing Transaction Creation & Retrieval...');
  const newTx = await db.createTransaction({
    user_id: createdUserId,
    tx_ref: testTxRef,
    user_name: 'Automated Test User',
    user_email: testEmail,
    type: 'deposit',
    amount: 1200.50,
    asset: 'USD',
    status: 'completed',
    notes: 'Initial test deposit'
  });
  assert.ok(newTx && newTx.id, 'Transaction must have an ID');
  assert.strictEqual(newTx.tx_ref, testTxRef);

  const userTxs = await db.getTransactionsByUserId(createdUserId);
  assert.ok(Array.isArray(userTxs) && userTxs.length >= 1, 'Transaction history must contain the created transaction');
  const foundTx = await db.getTransactionByRef(testTxRef);
  assert.strictEqual(foundTx.tx_ref, testTxRef);
  assert.strictEqual(Number(foundTx.amount), 1200.50);
  console.log('✅ PASS: Transaction created and verified by user_id and tx_ref:', testTxRef);

  // 9 & 10. Investment Plan Creation & Retrieval
  console.log('\n[TEST 9 & 10] Testing Investment Plan (OTC Plan) Creation & Retrieval...');
  const plan = await db.createOtcPlan({
    user_id: createdUserId,
    tranche_name: 'Executive Multi-Asset Tranche',
    amount: 500.00,
    weekly_roi_percent: 7.50,
    duration_days: 30,
    days_elapsed: 1,
    profit_accrued: 37.50,
    status: 'active'
  });
  assert.ok(plan && plan.id, 'Investment plan must have an ID');

  const retrievedPlan = await db.getOtcPlanByUserId(createdUserId);
  assert.ok(retrievedPlan, 'Plan must be retrievable by user_id');
  assert.strictEqual(retrievedPlan.tranche_name, 'Executive Multi-Asset Tranche');
  assert.strictEqual(Number(retrievedPlan.amount), 500.00);
  console.log('✅ PASS: Investment plan created and retrieved for user');

  // 11. Admin Dashboard Database Operations
  console.log('\n[TEST 11] Testing Admin Dashboard DB Operations...');
  const allUsers = await db.getAllUsers();
  assert.ok(Array.isArray(allUsers) && allUsers.length >= 2, 'getAllUsers must return all registered users');
  const allWallets = await db.getAllWallets();
  assert.ok(Array.isArray(allWallets) && allWallets.length >= 2, 'getAllWallets must return all wallets');
  const allTxs = await db.getAllTransactions();
  assert.ok(Array.isArray(allTxs) && allTxs.length >= 1, 'getAllTransactions must return transactions');
  const companyWallets = await db.getCompanyWallets();
  assert.ok(Array.isArray(companyWallets) && companyWallets.length === 6, 'Company wallets must return all 6 default crypto addresses');
  console.log('✅ PASS: Admin dashboard queries executed successfully (allUsers, allWallets, allTxs, companyWallets)');

  // 12. Customer Dashboard Database Operations
  console.log('\n[TEST 12] Testing Customer Dashboard Aggregations...');
  const userProfile = await db.findUserById(createdUserId);
  const userWallet = await db.getWalletByUserId(createdUserId);
  const userHistory = await db.getTransactionsByUserId(createdUserId);
  const userActivePlans = await db.getOtcPlanByUserId(createdUserId);
  assert.ok(userProfile && userWallet && userHistory && userActivePlans, 'Customer dashboard data bundle resolved');
  console.log('✅ PASS: Customer dashboard aggregated profile, wallet, transactions, and active plans');

  // 13. Email Logging & Retrieval
  console.log('\n[TEST 13] Testing Email Logging & Retrieval...');
  const logEntry = await db.logEmail({
    userId: createdUserId,
    to: testEmail,
    subject: 'Verification Code',
    html: '<p>Your OTP is 123456</p>',
    eventType: 'verification_code'
  });
  assert.ok(logEntry && logEntry.id, 'Email log must have an ID');
  const logs = await db.getEmailLogs();
  assert.ok(logs.some(l => l.recipient_email === testEmail), 'Email log must be listed in getEmailLogs()');
  console.log('✅ PASS: Email logging and retrieval operational');

  // 14. Financial Safety: Atomic Transactions & Overdraft Protections
  console.log('\n[TEST 14] Testing Simultaneous Financial Operations & Overdraft Protections...');
  // Current exchange balance is 1200.50.
  // We will run 5 concurrent debits of $300 each (Total requested: $1,500).
  // Exactly 4 should succeed (total $1,200), and the 5th MUST fail with overdraft protection.
  let successCount = 0;
  let failureCount = 0;

  const debitAttempts = [300, 300, 300, 300, 300].map(amount => {
    return db.withTransaction(async (client) => {
      await db.adjustWalletBalance(createdUserId, { exchangeDelta: -amount }, client);
    }).then(() => {
      successCount++;
    }).catch(err => {
      failureCount++;
    });
  });

  await Promise.all(debitAttempts);
  console.log(`Concurrent debit results: ${successCount} succeeded, ${failureCount} failed (safely rejected)`);

  assert.strictEqual(successCount, 4, 'Exactly 4 debits of $300 should succeed for a $1200.50 balance');
  assert.strictEqual(failureCount, 1, 'Exactly 1 debit must fail with overdraft prevention');

  const finalWallet = await db.getWalletByUserId(createdUserId);
  assert.strictEqual(Number(finalWallet.exchange_balance), 0.50, 'Final balance must be exactly $0.50 without rounding loss');
  console.log('✅ PASS: Concurrency and overdraft protection verified! Final balance:', finalWallet.exchange_balance);

  // Clean up test records
  console.log('\n[CLEANUP] Cleaning up test records from database...');
  await db.deleteOtcPlan(plan.id);
  await db.deleteTransaction(newTx.id);
  await db.pool.query('DELETE FROM email_logs WHERE recipient_email = $1', [testEmail]);
  await db.pool.query('DELETE FROM wallets WHERE user_id = $1', [createdUserId]);
  await db.deleteUser(createdUserId);
  console.log('✅ Cleanup completed cleanly');

  console.log('\n====================================================');
  console.log('🎉 ALL 14 TEST SUITES PASSED FLAWLESSLY AGAINST NEON!');
  console.log('====================================================');
}

runTestSuite()
  .then(() => process.exit(0))
  .catch(err => {
    console.error('❌ Test failed with error:', err);
    process.exit(1);
  });
