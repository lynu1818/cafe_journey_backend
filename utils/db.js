import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

export const connection = mysql.createPool({
    host: "localhost",
    user: "root",
    password: "lynu**18",
    database: "cafe_journey",
    connectTimeout: 30000, // 30 seconds
});