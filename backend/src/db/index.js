const { Pool } = require("pg");
require("dotenv").config();

const isProduction = process.env.NODE_ENV === "production";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: isProduction ? { rejectUnauthorized: true } : (process.env.DATABASE_URL?.includes("sslmode=require") ? { rejectUnauthorized: true } : false),
  connectionTimeoutMillis: 10000,  // wait up to 10s for Neon cold-start
  idleTimeoutMillis: 30000,        // release idle connections after 30s
  max: 5,                          // Neon free tier connection limit
});

pool.on("error", (err) => {
  console.error("Unexpected DB pool error:", err);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
};
