const express = require('express');
const mongoose = require('mongoose');
const nodemailer = require('nodemailer');
require('dotenv').config();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// In-memory token store for admin sessions (persists until server restart)
const validTokens = new Set();

// Middleware to parse JSON
app.use(express.json());

// Serve static files
app.use(express.static(path.join(__dirname)));

// Email Transporter Setup
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
}).then(() => {
  console.log('Connected to MongoDB');
  // Seed default rooms if none exist
  (async () => {
    try {
      const count = await Room.countDocuments();
      if (count === 0) {
        const defaults = [
          { name: 'One Bedroom Suite', slug: 'one-bedroom-suite', description: 'Spacious and well-finished', totalUnits: 5, availableUnits: 5, price: '$45,000' },
          { name: 'Two Bedroom Apartment', slug: 'two-bedroom-apartment', description: 'Perfect for families', totalUnits: 3, availableUnits: 3, price: '$70,000' },
          { name: 'Studio Apartment', slug: 'studio-apartment', description: 'Modern and compact', totalUnits: 4, availableUnits: 4, price: '$35,000' }
        ];
        await Room.insertMany(defaults);
        console.log('Seeded default rooms');
      }
    } catch (err) {
      console.error('Error seeding rooms:', err);
    }
  })();
}).catch((error) => {
  console.error('MongoDB connection error:', error);
});

// Lead Schema
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

// Contact Schema (for general inquiries)
const contactSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phone: String,
  message: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
});

const Contact = mongoose.model('Contact', contactSchema);

// Room Schema for availability management
const roomSchema = new mongoose.Schema({
  name: { type: String, required: true },
  slug: { type: String, required: true, unique: true },
  description: String,
  totalUnits: { type: Number, default: 1 },
  availableUnits: { type: Number, default: 0 },
  price: String,
  createdAt: { type: Date, default: Date.now }
});

const Room = mongoose.model('Room', roomSchema);

// Function to send email notification
async function sendEmailNotification(lead) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: `New Booking Inquiry - ${lead.roomType}`,
    html: `
      <h2>New Booking Inquiry Received</h2>
      <p><strong>Name:</strong> ${lead.name}</p>
      <p><strong>Email:</strong> ${lead.email}</p>
      <p><strong>Phone:</strong> ${lead.phone}</p>
      <p><strong>Room Type:</strong> ${lead.roomType}</p>
      <p><strong>Preferred Date:</strong> ${lead.preferredDate || 'Not specified'}</p>
      <p><strong>Preferred Time:</strong> ${lead.preferredTime || 'Not specified'}</p>
      <p><strong>Received At:</strong> ${new Date(lead.createdAt).toLocaleString()}</p>
      <hr>
      <p>Contact this person via WhatsApp at: <strong>${lead.phone}</strong></p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Email notification sent to', process.env.NOTIFY_EMAIL);
  } catch (error) {
    console.error('Error sending email:', error);
  }
}

// Function to send contact notification
async function sendContactNotification(contact) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: process.env.NOTIFY_EMAIL,
    subject: `New Contact Inquiry from ${contact.name}`,
    html: `
      <h2>New Contact Inquiry</h2>
      <p><strong>Name:</strong> ${contact.name}</p>
      <p><strong>Email:</strong> ${contact.email}</p>
      <p><strong>Phone:</strong> ${contact.phone || 'Not provided'}</p>
      <p><strong>Message:</strong><br/>${contact.message}</p>
      <p><strong>Received At:</strong> ${new Date(contact.createdAt).toLocaleString()}</p>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log('Contact notification sent to', process.env.NOTIFY_EMAIL);
  } catch (error) {
    console.error('Error sending contact email:', error);
  }
}

// Endpoint to receive lead data
app.post('/api/lead', async (req, res) => {
  try {
    const { name, email, phone, roomType, preferredDate, preferredTime } = req.body;

    // Validation
    if (!name || !email || !phone || !roomType) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Create new lead
    const lead = new Lead({
      name,
      email,
      phone,
      roomType,
      preferredDate,
      preferredTime
    });

    // Save to database
    await lead.save();

    console.log('Lead saved:', lead);

    // Send email notification
    await sendEmailNotification(lead);

    res.status(200).json({ 
      success: true, 
      message: 'Lead received. Please open WhatsApp to complete your inquiry.',
      leadId: lead._id 
    });

  } catch (error) {
    console.error('Error saving lead:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to receive general contact inquiries
app.post('/api/contact', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    const contact = new Contact({ name, email, phone, message });
    await contact.save();

    console.log('Contact saved:', contact);

    // Send email notification
    await sendContactNotification(contact);

    res.status(200).json({ success: true, message: 'Contact received. Thank you!' });
  } catch (error) {
    console.error('Error saving contact:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Endpoint to get all leads
app.get('/api/leads', async (req, res) => {
  try {
    // Check authentication
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !validTokens.has(token)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const leads = await Lead.find().sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Public endpoint to get rooms and availability
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await Room.find().sort({ name: 1 });
    res.status(200).json({ success: true, data: rooms });
  } catch (error) {
    console.error('Error fetching rooms:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected endpoint to create or update rooms (admin only)
app.post('/api/rooms', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !validTokens.has(token)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { name, slug, description, totalUnits, availableUnits, price } = req.body;

    if (!name || !slug) return res.status(400).json({ success: false, error: 'Name and slug required' });

    let room = await Room.findOne({ slug });
    if (room) {
      // update
      room.name = name;
      room.description = description;
      room.totalUnits = totalUnits ?? room.totalUnits;
      room.availableUnits = availableUnits ?? room.availableUnits;
      room.price = price;
      await room.save();
    } else {
      room = new Room({ name, slug, description, totalUnits, availableUnits, price });
      await room.save();
    }

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error('Error creating/updating room:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Protected endpoint to update availability (PATCH)
app.patch('/api/rooms/:id/availability', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token || !validTokens.has(token)) {
      return res.status(401).json({ success: false, error: 'Unauthorized' });
    }

    const { id } = req.params;
    const { availableUnits } = req.body;

    if (availableUnits == null || isNaN(availableUnits)) {
      return res.status(400).json({ success: false, error: 'availableUnits (number) required' });
    }

    const room = await Room.findById(id);
    if (!room) return res.status(404).json({ success: false, error: 'Room not found' });

    room.availableUnits = Math.max(0, Math.min(room.totalUnits, Number(availableUnits)));
    await room.save();

    res.status(200).json({ success: true, data: room });
  } catch (error) {
    console.error('Error updating room availability:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Login endpoint
app.post('/api/admin/login', (req, res) => {
  const { password } = req.body;

  if (!password) {
    return res.status(400).json({ success: false, error: 'Password required' });
  }

  if (password === process.env.ADMIN_PASSWORD) {
    // Generate a strong random token and store it in memory
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    // Initialize token store if necessary
    if (!global.validTokens) global.validTokens = new Set();
    global.validTokens.add(token);
    // Also expose a local reference for faster checks
    validTokens.add(token);

    res.status(200).json({ 
      success: true, 
      token,
      message: 'Login successful' 
    });
  } else {
    res.status(401).json({ success: false, error: 'Invalid password' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
