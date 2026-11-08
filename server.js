const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 10000;

// ตั้งค่าการเชื่อมต่อ PostgreSQL / Supabase
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(express.json());
// ใช้โฟลเดอร์หลักปัจจุบันเป็นที่เก็บไฟล์ Static (เช่น index.html, CSS, JS)
app.use(express.static(path.join(__dirname)));

// ทดสอบการเชื่อมต่อฐานข้อมูลตอนเริ่มเซิร์ฟเวอร์
pool.connect((err, client, release) => {
  if (err) {
    console.error('Database Error:', err.stack);
  } else {
    console.log('Successfully connected to Supabase database!');
    release();
  }
});

// ================= API Endpoints =================

// 1. ดึงข้อมูลพาสปอร์ตทั้งหมด (เรียงตามรหัสพนักงาน emp_code จากน้อยไปมาก)
app.get('/api/passports', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM passports ORDER BY emp_code ASC');
    res.json(result.rows);
  } catch (err) {
    console.error('Error fetching passports:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// 2. เพิ่มข้อมูลพาสปอร์ตใหม่ (POST /api/passports)
app.post('/api/passports', async (req, res) => {
  try {
    const {
      emp_name, emp_code, department, emp_group, passport_no,
      expiry_date, visa_expiry, work_permit_expiry, pink_card_expiry,
      ninety_day_expiry, birth_date, social_security_no, storage_location,
      photo_url, status
    } = req.body;

    const queryText = `
      INSERT INTO passports (
        emp_name, emp_code, department, emp_group, passport_no,
        expiry_date, visa_expiry, work_permit_expiry, pink_card_expiry,
        ninety_day_expiry, birth_date, social_security_no, storage_location,
        photo_url, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW())
      RETURNING *;
    `;

    const values = [
      emp_name, emp_code, department, emp_group, passport_no,
      expiry_date || null, visa_expiry || null, work_permit_expiry || null,
      pink_card_expiry || null, ninety_day_expiry || null, birth_date || null,
      social_security_no, storage_location, photo_url, status || 'Available'
    ];

    await pool.query(queryText, values);
    res.status(201).json({ message: 'บันทึกข้อมูลพนักงานเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error adding passport:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// 3. แก้ไขข้อมูลพาสปอร์ต (PUT /api/passports/:id)
app.put('/api/passports/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const {
      emp_name, emp_code, department, emp_group, passport_no,
      expiry_date, visa_expiry, work_permit_expiry, pink_card_expiry,
      ninety_day_expiry, birth_date, social_security_no, storage_location,
      photo_url
    } = req.body;

    const queryText = `
      UPDATE passports SET
        emp_name = $1, emp_code = $2, department = $3, emp_group = $4, passport_no = $5,
        expiry_date = $6, visa_expiry = $7, work_permit_expiry = $8, pink_card_expiry = $9,
        ninety_day_expiry = $10, birth_date = $11, social_security_no = $12, storage_location = $13,
        photo_url = $14
      WHERE id = $15;
    `;

    const values = [
      emp_name, emp_code, department, emp_group, passport_no,
      expiry_date || null, visa_expiry || null, work_permit_expiry || null,
      pink_card_expiry || null, ninety_day_expiry || null, birth_date || null,
      social_security_no, storage_location, photo_url, id
    ];

    await pool.query(queryText, values);
    res.json({ message: 'อัปเดตข้อมูลเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error updating passport:', err);
    res.status(500).json({ error: 'Internal Server Error', details: err.message });
  }
});

// 4. บันทึกการยืมพาสปอร์ต (POST /api/borrow)
app.post('/api/borrow', async (req, res) => {
  try {
    const { passport_id } = req.body;
    await pool.query("UPDATE passports SET status = 'Borrowed' WHERE id = $1", [passport_id]);
    res.json({ message: 'บันทึกการยืมเรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error borrowing:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// 5. บันทึกการคืนพาสปอร์ต (POST /api/return)
app.post('/api/return', async (req, res) => {
  try {
    const { passport_id } = req.body;
    await pool.query("UPDATE passports SET status = 'Available' WHERE id = $1", [passport_id]);
    res.json({ message: 'รับคืนพาสปอร์ตเข้าตู้เรียบร้อยแล้ว' });
  } catch (err) {
    console.error('Error returning:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// เสิร์ฟหน้า index.html หลัก
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
