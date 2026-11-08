const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// ตั้งค่าการเชื่อมต่อ PostgreSQL (Supabase)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// 1. API ดึงข้อมูลพาสปอร์ตทั้งหมด
app.get('/api/passports', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM passports ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 2. API เพิ่มข้อมูลพนักงานใหม่
app.post('/api/passports', async (req, res) => {
  const { 
    emp_name, emp_code, department, emp_group, passport_no, 
    expiry_date, visa_expiry, work_permit_expiry, pink_card_expiry, 
    ninety_day_expiry, birth_date, social_security_no, storage_location, photo_url 
  } = req.body;

  try {
    const query = `
      INSERT INTO passports (
        emp_name, emp_code, department, emp_group, passport_no, 
        expiry_date, visa_expiry, work_permit_expiry, pink_card_expiry, 
        ninety_day_expiry, birth_date, social_security_no, storage_location, photo_url, status
      ) 
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'Available') 
      RETURNING *;
    `;
    const values = [
      emp_name, emp_code, department, emp_group, passport_no, 
      expiry_date, visa_expiry, work_permit_expiry, pink_card_expiry, 
      ninety_day_expiry, birth_date, social_security_no, storage_location, photo_url
    ];
    const result = await pool.query(query, values);
    res.json({ message: 'บันทึกข้อมูลพนักงานสำเร็จ', data: result.rows[0] });
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 3. API แก้ไขข้อมูลพนักงาน
app.put('/api/passports/:id', async (req, res) => {
  const { id } = req.params;
  const { 
    emp_name, emp_code, department, emp_group, passport_no, 
    expiry_date, visa_expiry, work_permit_expiry, pink_card_expiry, 
    ninety_day_expiry, birth_date, social_security_no, storage_location, photo_url 
  } = req.body;

  try {
    const query = `
      UPDATE passports SET 
        emp_name = $1, emp_code = $2, department = $3, emp_group = $4, passport_no = $5, 
        expiry_date = $6, visa_expiry = $7, work_permit_expiry = $8, pink_card_expiry = $9, 
        ninety_day_expiry = $10, birth_date = $11, social_security_no = $12, storage_location = $13, photo_url = $14
      WHERE id = $15 RETURNING *;
    `;
    const values = [
      emp_name, emp_code, department, emp_group, passport_no, 
      expiry_date, visa_expiry, work_permit_expiry, pink_card_expiry, 
      ninety_day_expiry, birth_date, social_security_no, storage_location, photo_url, id
    ];
    const result = await pool.query(query, values);
    res.json({ message: 'อัปเดตข้อมูลสำเร็จ', data: result.rows[0] });
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// 4. API ยืมเล่ม
app.post('/api/borrow', async (req, res) => {
  const { passport_id } = req.body;
  try {
    await pool.query("UPDATE passports SET status = 'Borrowed' WHERE id = $1", [passport_id]);
    res.json({ message: 'บันทึกการยืมสำเร็จ' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 5. API รับคืน
app.post('/api/return', async (req, res) => {
  const { passport_id } = req.body;
  try {
    await pool.query("UPDATE passports SET status = 'Available' WHERE id = $1", [passport_id]);
    res.json({ message: 'รับคืนพาสปอร์ตเข้าตู้เซฟเรียบร้อยแล้ว' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// เริ่มต้นเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
