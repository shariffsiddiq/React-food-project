const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' })); // Increased limit for face descriptors

// Database connection
const db = mysql.createConnection({
  host: '127.0.0.1',
  user: 'root',
  password: '', // Update with your MySQL password if any
  database: 'face_auth'
});

// Connect to database
db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
    
    // Create users table if not exists
    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS users (
        id INT AUTO_INCREMENT PRIMARY KEY,
        username VARCHAR(100) NOT NULL UNIQUE,
        descriptor JSON NOT NULL
      )
    `;
    
    db.query(createTableQuery, (err, result) => {
      if (err) {
        console.error('Error creating users table:', err);
      } else {
        console.log('Users table ready');
      }
    });
  }
});

// Register endpoint
app.post('/api/register', (req, res) => {
  const { username, faceData } = req.body;
  
  if (!username || !faceData || faceData.length !== 3) {
    return res.status(400).json({ success: false, message: 'Invalid registration data' });
  }
  
  // Insert user into database
  const insertQuery = `INSERT INTO users (username, descriptor) VALUES (?, ?)`;
  
  db.query(insertQuery, [username, JSON.stringify(faceData)], (err, result) => {
    if (err) {
      console.error('Registration error:', err);
      
      // Handle duplicate username
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ success: false, message: 'Username already exists' });
      }
      
      return res.status(500).json({ success: false, message: 'Registration failed' });
    }
    
    res.status(201).json({ success: true, message: 'Face registration successful' });
  });
});

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, faceDescriptor } = req.body;
  
  if (!username || !faceDescriptor) {
    return res.status(400).json({ success: false, message: 'Missing login data' });
  }
  
  // Get stored face data
  const query = `SELECT descriptor FROM users WHERE username = ?`;
  
  db.query(query, [username], (err, results) => {
    if (err) {
      console.error('Login query error:', err);
      return res.status(500).json({ success: false, message: 'Login failed' });
    }
    
    if (results.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    
    // Return the stored descriptors for client-side face matching
    // (Face matching is better done on the client with face-api.js)
    const storedData = JSON.parse(results[0].descriptor);
    
    res.json({ success: true, message: 'Face data retrieved', faceData: storedData });
  });
});

// Get all users (for testing only, remove in production)
app.get('/api/users', (req, res) => {
  const query = `SELECT id, username FROM users`;
  
  db.query(query, (err, results) => {
    if (err) {
      return res.status(500).json({ success: false, message: 'Could not fetch users' });
    }
    
    res.json({ success: true, users: results });
  });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});