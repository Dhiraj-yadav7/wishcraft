# 🎉 WishCraft – AI Powered Birthday Surprise Platform

<p align="center">
  <strong>Create unforgettable digital birthday experiences with AI, beautiful animations, interactive story slides, personalized messages, and premium sharing features.</strong>
</p>

<p align="center">

![License](https://img.shields.io/badge/License-MIT-blue)
![Node.js](https://img.shields.io/badge/Node.js-Backend-green)
![MongoDB](https://img.shields.io/badge/MongoDB-Database-success)
![Vercel](https://img.shields.io/badge/Deploy-Vercel-black)
![Gemini AI](https://img.shields.io/badge/AI-Google_Gemini-orange)
![Responsive](https://img.shields.io/badge/Responsive-Yes-blueviolet)
![Status](https://img.shields.io/badge/Status-Production-success)

</p>

---

## 🌐 Live Demo

🔗 **Live Website:** https://birthday-bice-eta.vercel.app/

---

# 📖 About the Project

**WishCraft** is a modern AI-powered Birthday Surprise SaaS Platform that allows users to create beautiful, interactive birthday experiences and share them through a unique link.

Unlike traditional greeting cards, WishCraft creates an immersive story-based celebration including countdowns, videos, voice messages, memory galleries, QR code sharing, guestbooks, downloadable PDFs, and AI-generated birthday content.

This project demonstrates full-stack development skills using **JavaScript, Node.js, MongoDB, Serverless Functions, Cloudinary, and Google Gemini AI** while following modern SaaS design principles.

---

# ✨ Features

## 🔐 Authentication

- User Signup & Login
- JWT Authentication
- Protected Routes
- Forgot Password
- Profile Management
- Session Management

---

## 🎂 Birthday Surprise Builder

- Create personalized birthday pages
- Countdown timer
- Custom birthday message
- Relationship selection
- Background themes
- Voice message support
- Video support
- Memory timeline
- Photo gallery
- Guestbook
- Privacy settings

---

## 🎁 Story Experience

Instead of a long scrolling page, WishCraft presents birthdays as an interactive multi-step story:

1. Hero Section
2. Birthday Message
3. Video Message
4. Voice Message
5. Memory Gallery
6. Timeline
7. Music Experience
8. QR Code & Sharing
9. Guestbook

---

## 📸 Media Features

- Multiple Image Upload
- Memory Gallery
- Responsive Image Grid
- Lightbox Preview
- Voice Recording
- Video Support
- Background Music

---

## 🤖 AI Features

Powered by **Google Gemini AI**

- AI Birthday Wishes
- AI Gift Suggestions
- AI Birthday Messages
- AI Writing Assistant

---

## 📤 Sharing

- Copy Link
- WhatsApp
- Telegram
- Facebook
- X (Twitter)
- Email
- QR Code Sharing
- Native Share API

---

## 📄 Export

- Download as PDF
- Save as Image
- QR Code Download

---

## 📊 Dashboard

- Birthday Pages
- Analytics
- Total Views
- Guestbook Statistics
- QR Scan Analytics
- Public & Private Pages
- Search & Filters

---

## 👤 Profile Management

- Edit Profile
- Upload Profile Photo
- Change Password
- Notification Preferences
- Theme Settings
- Security Settings

---

# 🛠 Tech Stack

### Frontend

- HTML5
- CSS3
- JavaScript (ES6)
- Glassmorphism UI
- Responsive Design

### Backend

- Node.js
- Vercel Serverless Functions

### Database

- MongoDB
- Mongoose

### Authentication

- JWT
- bcryptjs

### AI

- Google Gemini API

### Media

- Cloudinary

### Deployment

- Vercel

---

# 📁 Project Structure

```text
api/
├── auth.js
├── pages.js
├── profile.js
├── ai.js
└── utils/

src/
├── css/
├── js/
├── assets/

manifest.json
sw.js
vercel.json
package.json
README.md
```

---

# ⚙️ Installation

Clone the repository

```bash
git clone https://github.com/YOUR_GITHUB_USERNAME/brithday-Wishes.git
```

Move into the project

```bash
cd brithday-Wishes
```

Install dependencies

```bash
npm install
```

Create `.env`

```env
MONGODB_URI=

JWT_SECRET=

GEMINI_API_KEY=

CLOUDINARY_CLOUD_NAME=

CLOUDINARY_API_KEY=

CLOUDINARY_API_SECRET=
```

Run locally

```bash
npm run dev
```

---

# 📡 API Overview

| Method | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/auth?action=signup` | Register user |
| POST | `/api/auth?action=login` | Login |
| GET | `/api/auth?action=user` | Verify Session |
| POST | `/api/pages` | Create Birthday Page |
| GET | `/api/pages?action=list` | Get Pages |
| POST | `/api/pages?action=comment` | Add Guestbook Wish |
| POST | `/api/ai` | Generate AI Content |
| PUT | `/api/profile` | Update Profile |

---

# 🚀 Deployment

This project is deployed on **Vercel**.

Deployment Steps:

1. Push code to GitHub
2. Connect repository to Vercel
3. Add environment variables
4. Deploy

---

# ⚡ Performance

- Lazy Loading
- Responsive Images
- Optimized Assets
- Serverless Architecture
- Mobile Friendly
- SEO Friendly
- PWA Ready

---

# 🚧 Future Improvements

- Mobile App
- Real-time Guestbook
- AI Video Generator
- Multi-language Support
- Custom Domains
- Team Collaboration
- Subscription Plans
- Template Marketplace

---

# 💡 Why I Built This

I built **WishCraft** to create a modern digital birthday experience that goes beyond traditional greeting cards.

The project showcases my ability to build production-ready full-stack applications with scalable architecture, responsive UI, serverless APIs, AI integration, and cloud-based media management.

---

# 👨‍💻 Author

**Dhiraj Yadav**

Final Year Computer Science Engineering Student

🚀 MERN Stack Developer

🌐 Portfolio: https://dhiraj-portfolio-beta.vercel.app/

💼 LinkedIn: https://www.linkedin.com/in/dhiraj-yadav-cse

🐙 GitHub: https://github.com/Dhiraj-yadav7

---

# ⭐ Support

If you found this project helpful, please consider giving it a **⭐ Star** on GitHub.

It motivates me to build more open-source projects.

---

## 📄 License

This project is licensed under the **MIT License**.
