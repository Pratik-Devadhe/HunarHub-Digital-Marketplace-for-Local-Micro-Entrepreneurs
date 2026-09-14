const path = require('path');
const dns = require('dns');
const net = require('net');

if (net.setDefaultAutoSelectFamily) {
    net.setDefaultAutoSelectFamily(false);
}
if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
}

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
    connectionTimeoutMillis: 15000,
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000
};

if (!isLocal) {
    poolConfig.ssl = { rejectUnauthorized: false };
}

const pool = new Pool(poolConfig);

pool.on('error', (err, client) => {
    console.error('Unexpected error on idle DB pool client:', err.message);
});

module.exports = pool;