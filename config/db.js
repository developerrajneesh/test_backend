const mysql = require('mysql2/promise')

const {
  MYSQL_HOST,
  MYSQL_USER,
  MYSQL_PASSWORD,
  MYSQL_DATABASE,
} = process.env

if (!MYSQL_HOST || !MYSQL_USER || !MYSQL_DATABASE) {
  console.warn(
    '[db] Missing MYSQL_* env vars. Set MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE.'
  )
}

const pool = mysql.createPool({
  host: MYSQL_HOST,
  user: MYSQL_USER,
  password: MYSQL_PASSWORD,
  port: process.env.MYSQL_PORT,
  database: MYSQL_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  timezone: 'Z',
})

async function query(sql, params = []) {
  const [rows] = await pool.query(sql, params)
  return rows
}

async function ping() {
  await pool.query('SELECT 1')
  return true
}

module.exports = { pool, query, ping }

