import dotenv from 'dotenv';
dotenv.config();
// import mysql from 'mysql2/promise';
// import fs from 'fs';
// import path from 'path';

// //const isProduction = process.env.NODE_ENV === 'production';
// // const caPath = isProduction
// //   ? '/etc/secrets/ca.pem'  // ✅ this is where Render mounts it
// //   : path.join(process.cwd(), 'secrets/ca.pem');


// export const db = mysql.createPool({
//   host: process.env.DB_HOST,
//   //port: Number(process.env.DB_PORT),
//   user: process.env.DB_ROOT_USER,
//   password: process.env.DB_ROOT_PASSWORD,
//   database: process.env.DB_NAME,
//   // ssl: {
//   //   ca: fs.readFileSync(caPath)
//   // },
//   waitForConnections: true,
//   connectionLimit: 10,
//   queueLimit: 0
// });

import pkg from 'pg';
const { Pool } = pkg;

export const db = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: { rejectUnauthorized: false }
});