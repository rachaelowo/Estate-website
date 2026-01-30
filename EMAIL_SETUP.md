# Email Notifications Setup Guide

Your website now sends you an email notification when someone books an inspection!

## Setup Instructions for Gmail

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Click "2-Step Verification" and follow the setup
3. Confirm your recovery email and phone number

### Step 2: Create App Password
1. Go back to [Google Account Security](https://myaccount.google.com/security)
2. Find "App passwords" (appears only after enabling 2FA)
3. Select "Mail" and "Windows Computer"
4. Google will generate a 16-character password
5. Copy this password

### Step 3: Update .env File
Open `.env` and update:

```
EMAIL_USER=your-gmail@gmail.com
EMAIL_PASSWORD=your-16-character-app-password
NOTIFY_EMAIL=your-gmail@gmail.com
```

Example:
```
EMAIL_USER=owola@gmail.com
EMAIL_PASSWORD=abcd efgh ijkl mnop
NOTIFY_EMAIL=owola@gmail.com
```

### Step 4: Install Package
```bash
npm install
```

### Step 5: Restart Server
```bash
npm run dev
```

## How It Works

1. User fills booking form on website
2. Data is saved to MongoDB
3. You receive an email notification with:
   - Visitor's name, email, phone
   - Room type they're interested in
   - Preferred date and time
   - Exact timestamp
   - WhatsApp contact number

## Testing

Fill out the booking form and check your email inbox within 30 seconds. The email comes from your configured Gmail address.

## Troubleshooting

- **No email received?** Check .env file has correct credentials
- **"Less secure app" error?** Use App Password, not regular password
- **Still no email?** Check spam folder or verify 2FA is enabled
- **Server won't start?** Run `npm install` first

## Alternative: Use Your Own Email Service

If you prefer a different email provider (SendGrid, Mailgun, etc.), let me know and I can update the configuration.
