const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname)));

const validTokens = new Set();

const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  totalUnits: { type: Number, default: 1 },
  availableUnits: { type: Number, default: 0 },
  price: String,
  status: {
    type: String,
    enum: ['available', 'limited', 'sold'],
    default: 'available'
  },
  createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: { type: String, required: true },
  roomType: { type: String, required: true },
  preferredDate: String,
  preferredTime: String,
  createdAt: { type: Date, default: Date.now }
});

const Lead = mongoose.model('Lead', leadSchema);

const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    const count = await Room.countDocuments();
    if (count === 0) {
      await Room.insertMany([
        {
          name: '4 Bedroom Fully Detached Duplex (Premium Unit)',
          slug: 'duplex-premium',
          description: 'Premium fully detached duplex with luxury finishing, smart lock, CCTV, solar water heater, swimming pool, gym & lounge.',
          totalUnits: 1,
          availableUnits: 1,
          price: '₦500,000,000',
          status: 'available'
        },
        {
          name: '4 Bedroom Fully Detached Duplex (Standard Units)',
          slug: 'duplex-standard',
          description: 'Luxury duplex with study room ensuite, 2 living rooms, modern kitchen fittings & smart security.',
          totalUnits: 3,
          availableUnits: 3,
          price: '₦450,000,000',
          status: 'available'
        }
      ]);

      console.log('Default rooms seeded');
    }
  })
  .catch(err => {
    console.error('MongoDB connection error:', err.message);
  });

/* ================= EMAIL ================= */

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});


app.post('/api/lead', async (req, res) => {
  try {
    const { name, email, phone, roomType, preferredDate, preferredTime } = req.body;

    if (!name || !email || !phone || !roomType) {
      return res.status(400).json({ success: false });
    }

    const lead = await Lead.create({ name, email, phone, roomType, preferredDate, preferredTime });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: `New Booking Inquiry - ${lead.roomType}`,
      html: `
        <h2>New Booking Inquiry</h2>
        <p><strong>Name:</strong> ${lead.name}</p>
        <p><strong>Email:</strong> ${lead.email}</p>
        <p><strong>Phone:</strong> ${lead.phone}</p>
        <p><strong>Unit:</strong> ${lead.roomType}</p>
      `
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false });
  }
});

app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false });
    }

    const contact = await Contact.create({ name, email, phone, message });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: process.env.NOTIFY_EMAIL,
      subject: `New Contact Inquiry - ${contact.name}`,
      html: `
        <h2>New Contact Inquiry</h2>
        <p><strong>Name:</strong> ${contact.name}</p>
        <p><strong>Email:</strong> ${contact.email}</p>
        <p><strong>Message:</strong><br>${contact.message}</p>
      `
    });

    res.json({ success: true });

  } catch (err) {
    console.error(err.message);
    res.status(500).json({ success: false });
  }
});

app.get('/api/lead', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ success: false });
  }

  const leads = await Lead.find().sort({ createdAt: -1 });
  res.json({ success: true, data: leads });
});

app.get('/api/rooms', async (req, res) => {
  const rooms = await Room.find().sort({ name: 1 });
  res.json({ success: true, data: rooms });
});

app.patch('/api/rooms/:id/availability', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ success: false });
  }

  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ success: false });

  room.availableUnits = Math.max(0, Math.min(room.totalUnits, Number(req.body.availableUnits)));

  if (room.availableUnits === 0) room.status = 'sold';
  else if (room.availableUnits <= 2) room.status = 'limited';
  else room.status = 'available';

  await room.save();

  res.json({ success: true, data: room });
});

app.patch('/api/rooms/:id/price', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token || !validTokens.has(token)) {
    return res.status(401).json({ success: false });
  }

  const room = await Room.findById(req.params.id);
  if (!room) return res.status(404).json({ success: false });

  room.price = req.body.price;
  await room.save();

  res.json({ success: true, data: room });
});

app.post('/api/admin/login', (req, res) => {
  if (req.body.password === process.env.ADMIN_PASSWORD) {
    const token = crypto.randomBytes(32).toString('hex');
    validTokens.add(token);
    return res.json({ success: true, token });
  }

  res.status(401).json({ success: false });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});