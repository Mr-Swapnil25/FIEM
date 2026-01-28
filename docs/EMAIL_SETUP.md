# 📧 Production Email Setup Guide

This guide explains how to configure **EventEase** to send real emails using Gmail or any SMTP provider.

---

## ✅ Option 1: Gmail (Recommended for Startups)

Since Google disabled "Less Secure Apps", you must use an **App Password**.

### 1. Generate App Password
1. Go to your [Google Account Security Settings](https://myaccount.google.com/security).
2. Enable **2-Step Verification** (if not already enabled).
3. Search for **"App Passwords"** in the search bar.
4. Create a new app password:
   - **App name**: `EventEase`
   - Click **Create**
5. Copy the 16-character password (e.g., `abcd efgh ijkl mnop`).

### 2. Configure Firebase
Run this command in your terminal (replace values with yours):

```bash
firebase functions:config:set email.service="gmail" email.user="your-email@gmail.com" email.pass="abcd efgh ijkl mnop"
```

### 3. Deploy
```bash
firebase deploy --only functions
```

---

## 🏢 Option 2: SendGrid / Mailgun / Other SMTP

If you have a dedicated email provider.

### 1. Get Credentials
- **Service Name**: See [Nodemailer supported services](https://nodemailer.com/smtp/well-known/) (e.g., `SendGrid`, `Mailgun`, `SES`).
- **User**: Usually `apikey` or your email.
- **Password**: Your API Key.

### 2. Configure Firebase
```bash
firebase functions:config:set email.service="SendGrid" email.user="apikey" email.pass="YOUR_SENDGRID_API_KEY"
```

---

## 🧪 Verification

1. **Check Config**:
   ```bash
   firebase functions:config:get
   ```
   You should see your email settings.

2. **Test**:
   - Create a booking in the app.
   - You should receive a real email instantly.
   - Check logs: `firebase functions:log`

---

## ⚠️ Troubleshooting

- **Error: "Invalid login"**: Double-check your App Password. Do NOT use your regular Gmail password.
- **Error: "ETIMEDOUT"**: Firebase free tier (Spark) blocks external network requests to non-Google services. **You must be on the Blaze (Pay-as-you-go) plan.**
