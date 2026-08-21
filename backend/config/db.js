const path = require('path');
require("dotenv").config({ path: path.resolve(__dirname, '.env') });
require("dotenv").config({ path: path.resolve(__dirname, '../.env') });
const { Pool } = require("pg");

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
    throw new Error("DATABASE_URL environment variable is missing.");
}

const isLocal = connectionString.includes("localhost") || connectionString.includes("127.0.0.1");

const poolConfig = {
    connectionString: connectionString,
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000
};

if (!isLocal) {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('error', (err) => {
    // Idle client error listener
});

module.exports = pool;