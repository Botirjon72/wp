// db.js
const { Pool } = require('pg');

const pool = new Pool({
  user: 'asddasf_rz5b_user',
  host: 'dpg-d1uhiq49c44c73d0ns5g-a.oregon-postgres.render.com',
  database: 'asddasf_rz5b',
  password: '9UnLnGV7xgojNSYZqahxi4ZR6GuRjSVu',
  port: 5432,
  ssl: {
    rejectUnauthorized: false
  }
});

module.exports = pool;
