const { Pool } = require('pg');

// Initialize the PostgreSQL connection pool
// Note: Requires POSTGRES_URL or specific DB credentials in the .env file
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || 'postgres://postgres:postgres@localhost:5432/bakery_db',
  // Recommended for production:
  // ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

pool.on('connect', () => {
  console.log('Connected to PostgreSQL database');
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client', err);
  process.exit(-1);
});

// Helper wrapper for parameterized queries to prevent SQL Injection
const query = (text, params) => {
  return pool.query(text, params);
};

// Helper for ACID Transactions
const getClient = async () => {
  const client = await pool.connect();
  const query = client.query.bind(client);
  const release = client.release.bind(client);
  
  // Monkey patch to track unreleased clients if necessary, otherwise just return
  return { client, query, release };
};

module.exports = {
  query,
  getClient,
  pool
};
