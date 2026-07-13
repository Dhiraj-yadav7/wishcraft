# WishCraft 🪄✨ — Premium Birthday Surprise SaaS Platform

WishCraft is a modern, high-fidelity digital birthday surprise creation platform designed as a complete, recruiter-ready full-stack SaaS. Users can craft elegant, personalized multi-slide birthday surprise experiences with countdown timers, dynamic message cards, responsive HTML5 video & cassette tape voice messages, photo grids, evolutionary timelines, Google Calendar integrations, visitor guestbooks, and downloadable PDF/image offline exports.

---

## 🚀 Key Features

* **Professional Landing Page & Quick Wizard**: Clean SaaS landing page featuring pricing tiers, accordions, and a live 4-step surprise builder demo that anonymous guests can try before signing up.
* **Responsive 10-Slide Story Experience**: Presentations are loaded as interactive story decks with keyboard shortcuts (`ArrowLeft` / `ArrowRight` / `Spacebar`) and top progress tracking bars:
  1. Countdown Hero Section
  2. Dynamic Birthday Message
  3. Interactive YouTube & HTML5 Video Player
  4. Web Audio Cassette Tape Voice Recorder
  5. Photo Gallery Lightbox Carousel
  6. Evolutionary Birthday Timeline Nodes
  7. Luxury Gift Recommendation Suggestions
  8. Synthesized Web Audio Soundtracks
  9. Social Sharing Options & QR Codes
  10. Guestbook Comments (with spam moderation and inline updates)
* **Connected Accounts Settings**: Form switching toggles (View vs Edit modes) with custom connected brand domain settings, security password update modals, login history activity logs, data backups, and permanent delete confirmation logic.
* **Offline PDF & PNG Downloads**: Instant high-fidelity PDF documents and PNG snapshots generation utilizing client-side canvas render libraries.
* **Vercel Serverless Architecture & Fallback DB**: Runs on a hybrid Mongo database connector. If `MONGODB_URI` is undefined, the app automatically maps records to a local JSON file-based database adapter, falling back to writeable `/tmp` folders when running in cloud serverless deployments.
* **Spam Prevention & Rate Limiting**: Lightweight IP-based rate limiting on serverless entrypoints protects Gemini AI key generation (10 requests/min) and Guestbook comment signatures (8 submissions/min).

---

## 🛠️ Technology Stack

- **Frontend**: Vanilla HTML5, CSS3 Custom Properties (Glassmorphism & Flexbox), ES6 Javascript modules.
- **Backend**: Node.js, Vercel Serverless Functions.
- **Database**: MongoDB (via Mongoose schemas) with local `db.json` file adapter fallback.
- **Media Upload**: Cloudinary (via SDK configuration) with base64 compressed fallback.
- **AI Engine**: Google Gemini API (Google Generative Language endpoints).
- **Libraries**: `html2canvas` (screenshots), `jsPDF` (document compiled records), `bcryptjs` (password hashing), `jsonwebtoken` (session authorizations).

---

## 📁 Repository Structure

```text
├── api/                   # Vercel Serverless Function handlers
│   ├── utils/
│   │   ├── db.js          # Mongoose database models and local JSON DB adapter
│   │   ├── rateLimiter.js # IP-based serverless memory rate limiter
│   │   └── response.js    # JSON standard success/error wrappers
│   ├── ai.js              # Gemini generation & curated fallback template rules
│   ├── auth.js            # JWT login, signup, forgot/reset password handlers
│   ├── pages.js           # CRUD pages, analytics, guestbook, duplications
│   └── profile.js         # Security settings, Connected domains, Cloudinary uploads
├── src/
│   ├── css/               # Core styling files
│   │   ├── auth.css       # Signup, login, & recovery structures
│   │   ├── dashboard.css  # Creator dashboard metrics grids
│   │   ├── generator.css  # Surprise creation canvas tabs
│   │   ├── style.css      # Core global styles & sliding drawers
│   │   └── themes.css     # Aesthetic gradient color presets
│   └── js/                # Client scripts
│       ├── auth.js        # Route guards, anti-flicker overlays & token stores
│       ├── builder.js     # Landing page interactive wizard script
│       ├── dashboard.js   # Analytics charts, sorting & page management
│       ├── generator.js   # Configuration stack undo/redo history controls
│       ├── pwa.js         # Service Worker registration & notifications
│       ├── viewer.js      # 10-slide sequential Story controller
│       └── wish.js        # Envelope reveal script for builder preview
├── .env.example           # Configurations environment templates
├── db.json                # Local JSON fallback database storage
├── vercel.json            # Vercel deployment rewrites and headers clean URLs
├── sw.js                  # PWA service worker with precaching resources
├── manifest.json          # Web app installation manifest
├── LICENSE                # MIT License permissions
└── package.json           # Scripts and dependency maps
```

---

## 🔧 Installation & Local Setup

### Prerequisites
- Node.js (v16.x or newer)
- npm or yarn

### Steps
1. **Clone the Repository**:
   ```bash
   git clone https://github.com/Dhiraj-yadav7/brithday-Wishes.git
   cd birthday-wishes-app
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```
3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and adjust the variables:
   ```bash
   cp .env.example .env
   ```
4. **Start Local Development Server**:
   Launch Vercel CLI locally to run serverless routes alongside frontend assets:
   ```bash
   npm run dev
   ```
   Open **[http://localhost:3000](http://localhost:3000)** in your browser.

---

## 🔌 API Endpoints Summary

| Method | Endpoint | Action | Access | Description |
|---|---|---|---|---|
| **POST** | `/api/auth?action=signup` | Account Signup | Public | Create new credentials |
| **POST** | `/api/auth?action=login` | Account Login | Public | Authenticates credentials and logs history |
| **GET** | `/api/auth?action=user` | Verify JWT | Protected | Validates current user session |
| **GET** | `/api/pages?action=list` | Fetch Pages | Protected | Fetch cards with analytics counts |
| **POST** | `/api/pages` | Create Card | Protected | Create new surprise page configuration |
| **GET** | `/api/pages?action=public` | View Card | Public | Public slide viewer data details |
| **POST** | `/api/pages?action=comment` | Comment Post | Public | Write new guestbook comment signature |
| **POST** | `/api/pages?action=duplicate`| Duplicate Layout | Protected | Clone layout structure into a draft |
| **POST** | `/api/ai` | Gemini Generator| Public/Auth| Creative AI wishes and budgets |
| **PUT** | `/api/profile` | Update Profile | Protected | Edit creator preferences and email |
| **POST** | `/api/profile?action=upload-photo` | Edit Photo | Protected | Upload/Remove Cloudinary user profile image |

---

## 🚢 Deployment Guide

The project is fully pre-configured for Vercel:
1. Push your changes to your GitHub branch.
2. Link the repository to your Vercel Dashboard.
3. Add environment variables (`MONGODB_URI`, `JWT_SECRET`, `GEMINI_API_KEY`) to Vercel Project Settings.
4. Click **Deploy**. Vercel will build and serve serverless paths automatically.

---

## 📄 License
This project is licensed under the terms of the [MIT License](LICENSE).