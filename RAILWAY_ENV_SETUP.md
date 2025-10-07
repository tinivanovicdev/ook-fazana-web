# Railway Environment Variables Setup

## Required Environment Variables for OOK FAŽANA Web

To enable the membership form email functionality using Resend, you need to set the following environment variables in your Railway project.

---

## 🔧 Environment Variables

### 1. **RESEND_API_KEY** (Required)
- **Description**: Your Resend API key for sending emails
- **How to get it**:
  1. Go to [Resend.com](https://resend.com)
  2. Sign up or log in to your account
  3. Navigate to API Keys section
  4. Create a new API key
  5. Copy the key (starts with `re_`)
- **Example value**: `re_123456789abcdefghijklmnop`

### 2. **RESEND_FROM_EMAIL** (Required)
- **Description**: The verified sender email address that will appear in the "From" field
- **Important**: This email must be from a domain you've verified in Resend
- **Format**: `Name <email@yourdomain.com>`
- **Example value**: `OOK FAŽANA <noreply@ookfazana.hr>`
- **Note**: For testing, you can use `onboarding@resend.dev` but it's recommended to verify your own domain for production

### 3. **MEMBERSHIP_EMAIL** (Optional)
- **Description**: The email address where membership applications will be sent
- **Default**: `info@ookfazana.hr` (if not set)
- **Example value**: `info@ookfazana.hr`

---

## 📋 Step-by-Step Setup in Railway

1. **Log in to Railway** and open your "OOK Fazana Web" project

2. **Navigate to Variables**:
   - Click on your service
   - Go to the "Variables" tab

3. **Add each environment variable**:
   - Click "New Variable"
   - Enter the variable name (e.g., `RESEND_API_KEY`)
   - Enter the variable value
   - Click "Add"

4. **Redeploy your service** (Railway will do this automatically after adding variables)

---

## 🎯 Resend Domain Verification (Recommended)

For production use, you should verify your domain in Resend:

1. Log in to [Resend.com](https://resend.com)
2. Go to "Domains" section
3. Click "Add Domain"
4. Enter your domain (e.g., `ookfazana.hr`)
5. Follow the instructions to add DNS records to your domain
6. Wait for verification (usually a few minutes to hours)
7. Once verified, you can use emails like `noreply@ookfazana.hr` or `info@ookfazana.hr`

---

## ✅ Testing the Setup

After setting up the environment variables:

1. Deploy your application to Railway
2. Visit your website's "Učlani se" page
3. Fill out the membership form
4. Submit the form
5. Check the email inbox specified in `MEMBERSHIP_EMAIL`
6. You should receive a formatted email with all the membership details

---

## 📧 Email Content

The membership form will send an email with the following information:

- **Subject**: "Nova prijava za članstvo - [Member Name]"
- **Content includes**:
  - Program selection
  - Member's full name
  - Parent's name
  - Birth date and enrollment date
  - Gender and citizenship
  - OIB (Croatian personal identification number)
  - Address, phone, and email
  - Optional notes

---

## 🔍 Troubleshooting

### Email not sending?
- Check that `RESEND_API_KEY` is correctly set
- Verify that `RESEND_FROM_EMAIL` is from a verified domain
- Check Railway logs for error messages

### Using the test email?
If you haven't verified your domain yet, use:
```
RESEND_FROM_EMAIL=OOK FAŽANA <onboarding@resend.dev>
```
Note: This is for testing only. Verify your domain for production use.

---

## 📝 Summary

**Minimum required variables**:
```
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=OOK FAŽANA <onboarding@resend.dev>
```

**Recommended for production**:
```
RESEND_API_KEY=your_resend_api_key_here
RESEND_FROM_EMAIL=OOK FAŽANA <noreply@ookfazana.hr>
MEMBERSHIP_EMAIL=info@ookfazana.hr
```

