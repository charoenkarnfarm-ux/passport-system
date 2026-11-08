const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');

// บังคับ Timezone ฝั่ง Node.js ให้เป็นเวลาประเทศไทยเสมอ
process.env.TZ = 'Asia/Bangkok';

const app = express();
app.use(express.json());
app.use(cors());

// อนุญาตให้เปิดไฟล์หน้าเว็บไซต์และโฟลเดอร์รูปภาพได้โดยตรง
app.use(express.static(__dirname));

// ตั้งค่าเชื่อมต่อฐานข้อมูล MySQL พร้อมกำหนด dateStrings: true เพื่อล็อกวันที่ไม่ให้เคลื่อน
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '', // หากตั้งรหัสผ่าน root ไว้ ให้ใส่ตรงนี้
    database: 'passport_db',
    waitForConnections: true,
    connectionLimit: 10,
    dateStrings: true 
});

// API: ดึงรายชื่อพาสปอร์ตและข้อมูลทั้งหมด
app.get('/api/passports', async (req, res) => {
    try {
        const [rows] = await pool.query('SELECT * FROM passports');
        res.json(rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API: เพิ่มพนักงานใหม่ผ่านหน้าเว็บ
app.post('/api/passports', async (req, res) => {
    let { 
        emp_name, emp_code, department, emp_group, passport_no, 
        expiry_date, visa_expiry, work_permit_expiry, 
        pink_card_expiry, ninety_day_expiry, birth_date, 
        social_security_no, storage_location, photo_url 
    } = req.body;

    try {
        await pool.query(
            `INSERT INTO passports (emp_name, emp_code, department, emp_group, passport_no, expiry_date, visa_expiry, work_permit_expiry, pink_card_expiry, ninety_day_expiry, birth_date, social_security_no, storage_location, photo_url, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Available')`,
            [
                emp_name, 
                emp_code || null, 
                department || null, 
                emp_group || null, 
                passport_no, 
                expiry_date || null, 
                visa_expiry || null, 
                work_permit_expiry || null, 
                pink_card_expiry || null, 
                ninety_day_expiry || null, 
                birth_date || null, 
                social_security_no || null, 
                storage_location || null, 
                photo_url || null
            ]
        );
        res.json({ success: true, message: 'เพิ่มพนักงานใหม่สำเร็จ' });
    } catch (err) {
        console.error("Insert error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: บันทึกการยืมพาสปอร์ต
app.post('/api/borrow', async (req, res) => {
    const { passport_id, borrower_name, purpose, due_date, admin_recorder } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            `INSERT INTO borrow_logs (passport_id, borrower_name, purpose, borrow_date, due_date, admin_recorder) 
             VALUES (?, ?, ?, NOW(), ?, ?)`,
            [passport_id, borrower_name, purpose, due_date, admin_recorder]
        );

        await connection.query(
            `UPDATE passports SET status = 'Borrowed' WHERE id = ?`,
            [passport_id]
        );

        await connection.commit();
        res.json({ success: true, message: 'บันทึกการยืมพาสปอร์ตสำเร็จ' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

// API: บันทึกการคืนพาสปอร์ต
app.post('/api/return', async (req, res) => {
    const { passport_id } = req.body;
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        await connection.query(
            `UPDATE borrow_logs SET return_date = NOW() WHERE passport_id = ? AND return_date IS NULL`,
            [passport_id]
        );

        await connection.query(
            `UPDATE passports SET status = 'Available' WHERE id = ?`,
            [passport_id]
        );

        await connection.commit();
        res.json({ success: true, message: 'บันทึกรับคืนพาสปอร์ตเข้าตู้เรียบร้อย' });
    } catch (err) {
        await connection.rollback();
        res.status(500).json({ success: false, error: err.message });
    } finally {
        connection.release();
    }
});

// API: อัปเดตข้อมูลพนักงานและพาสปอร์ต
app.put('/api/passports/:id', async (req, res) => {
    const { id } = req.params;
    let { 
        emp_name, emp_code, department, emp_group, passport_no, 
        expiry_date, visa_expiry, work_permit_expiry, 
        pink_card_expiry, ninety_day_expiry, birth_date, 
        social_security_no, storage_location, photo_url 
    } = req.body;

    try {
        await pool.query(
            `UPDATE passports SET emp_name = ?, emp_code = ?, department = ?, emp_group = ?, passport_no = ?, expiry_date = ?, visa_expiry = ?, work_permit_expiry = ?, pink_card_expiry = ?, ninety_day_expiry = ?, birth_date = ?, social_security_no = ?, storage_location = ?, photo_url = ? WHERE id = ?`,
            [
                emp_name, 
                emp_code || null, 
                department || null, 
                emp_group || null, 
                passport_no, 
                expiry_date || null, 
                visa_expiry || null, 
                work_permit_expiry || null, 
                pink_card_expiry || null, 
                ninety_day_expiry || null, 
                birth_date || null, 
                social_security_no || null, 
                storage_location || null, 
                photo_url || null, 
                id
            ]
        );
        res.json({ success: true, message: 'อัปเดตข้อมูลพนักงานสำเร็จ' });
    } catch (err) {
        console.error("Update error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));