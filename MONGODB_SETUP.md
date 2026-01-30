# Estate Website - MongoDB Setup Guide

## Installation Steps

1. **Install Node Modules**
   ```bash
   npm install
   ```

2. **Setup MongoDB**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free account
   - Create a new cluster
   - Get your connection string (looks like: `mongodb+srv://username:password@cluster.mongodb.net/database-name`)
   - Copy it to the `.env` file: `MONGODB_URI=your-connection-string`

3. **Start the Server**
   ```bash
   npm start       # Production
   npm run dev     # Development (with auto-reload)
   ```
   Server will run on `http://localhost:3000`

## How It Works

1. User fills out the booking form
2. Form data is sent to backend (`POST /api/lead`)
3. Backend validates and saves to MongoDB
4. User is redirected to WhatsApp with pre-filled message
5. You can view all leads in MongoDB Atlas

## Viewing Your Leads

In MongoDB Atlas, navigate to:
- Collections → Database → Leads collection
- You'll see all saved bookings with timestamp

## What's Stored

Each lead captures:
- Name
- Email
- Phone
- Room Type
- Preferred Date
- Preferred Time
- Created At (automatic)

## Environment Variables (.env)

```
PORT=3000
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/estate-database
NODE_ENV=development
```

Replace username, password, and cluster name with your MongoDB credentials.
