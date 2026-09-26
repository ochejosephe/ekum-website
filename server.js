require('dotenv').config();
const express = require('express');
const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const nodemailer = require('nodemailer');

const app = express();
const PORT = process.env.PORT || 3000;
const dataDir = path.join(__dirname, 'data');
const dbPath = path.join(dataDir, 'ekum.db');

if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new sqlite3.Database(dbPath);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: String(process.env.SMTP_SECURE || 'false') === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const dbReady = new Promise((resolve, reject) => {
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS service_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      service TEXT NOT NULL,
      property_type TEXT,
      preferred_date TEXT,
      message TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.get('SELECT 1', (err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
});

function renderPage(res, view, options = {}) {
  return res.render(view, {
    currentPage: options.currentPage || view,
    ...options,
  });
}

app.get('/', (req, res) => {
  renderPage(res, 'index', { currentPage: 'index', title: 'Ekum Electricals | Professional Electrical Solutions' });
});

app.get('/about', (req, res) => {
  renderPage(res, 'about', { currentPage: 'about', title: 'About | Ekum Electricals' });
});

app.get('/services', (req, res) => {
  renderPage(res, 'services', { currentPage: 'services', title: 'Services | Ekum Electricals' });
});

app.get('/projects', (req, res) => {
  renderPage(res, 'projects', { currentPage: 'projects', title: 'Projects | Ekum Electricals' });
});

app.get('/contact', (req, res) => {
  renderPage(res, 'contact', {
    currentPage: 'contact',
    title: 'Contact | Ekum Electricals',
    success: req.query.success === '1',
    error: req.query.error || null,
  });
});

app.post('/contact', async (req, res) => {
  const { fullName, email, phone, service, propertyType, preferredDate, message } = req.body;

  if (!fullName || !email || !message) {
    return res.status(400).render('contact', {
      currentPage: 'contact',
      title: 'Contact | Ekum Electricals',
      error: 'Please provide your full name, email and message.',
      success: false,
    });
  }

  const formMessage = message || `Service request: ${service || 'General enquiry'}`;

  try {
    await dbReady;

    db.run(
      `INSERT INTO service_requests (full_name, phone, email, service, property_type, preferred_date, message) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [fullName, phone || '', email, service || 'General enquiry', propertyType || '', preferredDate || '', formMessage],
      async (err) => {
        if (err) {
          console.error('Database insert error:', err);
          return res.status(500).render('contact', {
            currentPage: 'contact',
            title: 'Contact | Ekum Electricals',
            error: 'We could not save your request right now. Please try again.',
            success: false,
          });
        }

        const mailOptions = {
          from: process.env.SMTP_FROM || process.env.SMTP_USER,
          to: process.env.CONTACT_RECEIVER_EMAIL,
          subject: `New service request from ${fullName}`,
          text: `Name: ${fullName}\nEmail: ${email}\nPhone: ${phone || 'N/A'}\nService: ${service || 'General enquiry'}\nProperty Type: ${propertyType || 'N/A'}\nPreferred Date: ${preferredDate || 'N/A'}\n\nMessage:\n${formMessage}`,
        };

        try {
          if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
            await transporter.sendMail(mailOptions);
          }

          return res.redirect('/contact?success=1');
        } catch (mailError) {
          console.error('Email send error:', mailError);
          return res.redirect('/contact?success=1');
        }
      }
    );
  } catch (error) {
    console.error('Database setup error:', error);
    return res.status(500).render('contact', {
      currentPage: 'contact',
      title: 'Contact | Ekum Electricals',
      error: 'There was a problem setting up the database.',
      success: false,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Ekum Electricals app is running on http://localhost:${PORT}`);
});
