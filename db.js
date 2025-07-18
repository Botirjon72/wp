// db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',      // o'zgartiring
  host: 'localhost',
  database: 'postgres',      // o'zgartiring
  password: '1',  // o'zgartiring
  port: 5432,
});

module.exports = pool;
