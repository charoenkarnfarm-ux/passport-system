require('dotenv').config();
const axios = require('axios');
const mysql = require('mysql2/promise');

async function runDailyAlert() {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME
    });

    try {
        // 1. ตรวจสอบเล่มที่เลยกำหนดคืน
        const [overdue] = await connection.query(`
            SELECT p.emp_name, p.passport_no, l.due_date 
            FROM borrow_logs l
            JOIN passports p ON l.passport_id = p.id
            WHERE l.return_date IS NULL AND l.due_date < CURDATE()
        `);

        if (overdue.length > 0) {
            let msg = "🚨 แจ้งเตือน: พาสปอร์ตเลยกำหนดคืน!\n";
            overdue.forEach(r => msg += `- ${r.emp_name} (${r.passport_no}) กำหนดคืน: ${r.due_date}\n`);
            await sendLineNotify(msg);
        }

        // 2. ตรวจสอบพาสปอร์ตใกล้หมดอายุใน 6 เดือน
        const [expiring] = await connection.query(`
            SELECT emp_name, passport_no, expiry_date 
            FROM passports 
            WHERE expiry_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 6 MONTH)
        `);

        if (expiring.length > 0) {
            let msg = "⚠️ แจ้งเตือน: พาสปอร์ตใกล้หมดอายุใน 6 เดือน!\n";
            expiring.forEach(r => msg += `- ${r.emp_name} (${r.passport_no}) หมดอายุ: ${r.expiry_date}\n`);
            await sendLineNotify(msg);
        }

    } catch (err) {
        console.error("Alert error:", err);
    } finally {
        await connection.end();
    }
}

async function sendLineNotify(message) {
    try {
        await axios.post('https://notify-api.line.me/api/notify', 
            `message=${encodeURIComponent(message)}`, {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Bearer ${process.env.LINE_TOKEN}`
                }
            }
        );
    } catch (error) {
        console.error("LINE Notify failed:", error);
    }
}

runDailyAlert();