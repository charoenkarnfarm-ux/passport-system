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

// Middleware สำหรับอ่านค่า JSON และเปิดใช้งานไฟล์สแตติก (HTML, รูปภาพ ฯลฯ)
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));

// ตัวอย่าง API ดึงข้อมูลพาสปอร์ตทั้งหมดจากตาราง passports
app.get('/api/passports', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM passports ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ตัวอย่าง API เพิ่มข้อมูลพาสปอร์ต
app.post('/api/passports', async (req, res) => {
  const { passport_no, holder_name, expiry_date } = req.body;
  try {
    const query = `
      INSERT INTO passports (passport_no, holder_name, expiry_date) 
      VALUES ($1, $2, $3) RETURNING *;
    `;
    const values = [passport_no, holder_name, expiry_date];
    const result = await pool.query(query, values);
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Database Error:', err);
    res.status(500).json({ error: err.message });
  }
});

// เริ่มต้นเซิร์ฟเวอร์
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
