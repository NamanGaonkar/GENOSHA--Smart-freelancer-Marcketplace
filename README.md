# GENOSHA — The Freelance Marketplace

> Connect elite independent freelancers with clients through streamlined bidding, contract execution, and real-time collaboration.

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3FCF8E?logo=supabase)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.3-06B6D4?logo=tailwindcss)
![Vite](https://img.shields.io/badge/Vite-8.2-646CFF?logo=vite)

---

## Overview

GENOSHA is a full-stack freelancer marketplace platform built for the gig economy. Clients post jobs, freelancers submit proposals, and both parties collaborate through real-time chat, milestone tracking, and video calls — all within a clean Linear-style dark theme.

**Category:** Business / Gig Economy  
**Domain:** Freelancer Marketplace & Talent Exchange

---

## Features

### Core Marketplace
- **Job Posting & Discovery** — Clients post jobs with title, description, skills, budget type (Fixed/Hourly/Weekly), and currency (INR/USD)
- **Proposal & Bidding** — Freelancers submit proposals with bid amount, delivery timeline, cover letter, and portfolio attachments
- **Contract Lifecycle** — Full state management: pending_deposit → in_progress → under_review → completed
- **Escrow & Milestones** — Fund milestones, submit deliverables, approve & release payment

### Real-Time Collaboration
- **Chat System** — WhatsApp-style 1-on-1 messaging powered by Supabase Realtime channels
- **Video Calling** — Jitsi Meet integration with screen sharing directly from chat
- **File Attachments** — Upload and preview images, PDFs, and design assets in chat
- **Typing Indicators & Presence** — Live online/offline status and typing dots

### AI-Powered Tools (Groq API)
- **AI Job Optimizer** — "Polish with AI" transforms brief job notes into comprehensive PRDs
- **Proposal Assistant** — "Draft Proposal" generates structured, high-conversion proposals
- **AI Support Chatbot** — Floating widget answering platform queries, escrow flows, and disputes
- **Admin AI Governance** — Rate limiting, kill switch, model selector, and usage tracking

### Dashboards & Analytics
- **Freelancer Dashboard** — Contract status pie chart, earnings trend line chart, skills in demand bar chart, pending proposals, available jobs
- **Client Dashboard** — Job distribution pie chart, spending trend line chart, active hires, incoming proposals
- **Admin Panel** — User roles donut chart, contract status overview, platform volume trend, user growth curve, job status breakdown, user/job management, dispute mediation

### Trust & Security
- **Two-Way Reviews** — Post-contract 5-star rating and written feedback for both parties
- **Dispute Resolution** — Escalation flow with admin mediation (refund client / force-release to freelancer)
- **Row-Level Security** — Supabase RLS policies isolating data per user role
- **PDF Invoices** — Auto-generated invoices for completed milestones with dual currency display

### Notifications
- **Real-Time Notification Bell** — Toast + bell badge for job posted, proposal submitted/accepted/rejected, contract completed, disputes
- **Clear All** — One-click notification cleanup

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, TypeScript 6, Vite 8 |
| Styling | Tailwind CSS 4, Lucide Icons |
| Charts | Recharts (Pie, Line, Bar, Area) |
| Backend | Supabase (PostgreSQL, Auth, Realtime, Storage, RLS) |
| AI | Groq SDK (compound-mini model) |
| Video | Jitsi Meet (iframe + react-sdk) |
| PDF | jsPDF + html2canvas |
| Routing | React Router DOM 7 |

---

## Project Structure

```
GENOSHA/
├── public/                    # Static assets (logo.png, background.png)
├── src/
│   ├── components/            # Reusable UI components
│   │   ├── AIAssistant.tsx    # "Polish with AI" / "Draft Proposal" buttons
│   │   ├── AIChatbot.tsx      # Floating AI support chatbot with voice
│   │   ├── AIGovernance.tsx   # Admin AI config & kill switch panel
│   │   ├── BorderBeam.tsx     # Animated border effect
│   │   ├── DisputeCenter.tsx  # Admin dispute mediation
│   │   ├── InvoicePDF.tsx     # PDF invoice generator
│   │   ├── LandingPage.tsx    # Hero + features + CTA landing
│   │   ├── Layout.tsx         # App shell with navbar
│   │   ├── Navbar.tsx         # Top navigation bar
│   │   ├── Notifications.tsx  # Bell + dropdown notification panel
│   │   └── VideoCall.tsx      # Jitsi video call with PiP mode
│   ├── contexts/
│   │   ├── AuthContext.tsx     # Supabase auth + session management
│   │   └── ThemeContext.tsx    # Dark/Light theme provider
│   ├── lib/
│   │   ├── api.ts             # Supabase API functions (CRUD + realtime)
│   │   ├── supabase.ts        # Supabase client initialization
│   │   └── utils.ts           # Currency formatting (INR/USD), helpers
│   ├── pages/
│   │   ├── AuthPage.tsx       # Login / Sign Up with background video
│   │   ├── ConfirmPage.tsx    # Email confirmation handler
│   │   ├── ContractsPage.tsx  # Contract listing
│   │   ├── ContractDetailPage.tsx  # Contract detail + milestones
│   │   ├── CreateJobPage.tsx  # Post a new job
│   │   ├── DashboardPage.tsx  # Role-specific dashboard (Freelancer/Client)
│   │   ├── EditJobPage.tsx    # Edit existing job
│   │   ├── FindWorkPage.tsx   # Browse & filter jobs (Freelancer)
│   │   ├── JobDetailPage.tsx  # Job detail + proposals + hire
│   │   ├── JobsPage.tsx       # Job listings (Client)
│   │   ├── MessagesPage.tsx   # Real-time chat + video call
│   │   ├── ProfilePage.tsx    # User profile + avatar upload
│   │   └── AdminPage.tsx      # Admin panel with all management tabs
│   ├── types/
│   │   └── database.ts        # TypeScript interfaces for Supabase tables
│   ├── App.tsx                # Router + route definitions
│   ├── index.css              # Global styles + theme variables
│   └── main.tsx               # Entry point
├── documentation/             # PRD, SRS, and design docs
├── schema.sql                 # Database schema (gitignored)
├── .env                       # Environment variables (gitignored)
├── .gitignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── index.html
```

---

## Getting Started

### Prerequisites
- Node.js 18+
- A Supabase project (free tier works)
- Groq API key (optional, for AI features)

### Installation

```bash
# Clone the repository
git clone <repo-url>
cd GENOSHA

# Install dependencies
npm install

# Create environment file
cp .env.example .env
```

### Environment Variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GROQ_API_KEY=gsk_your-groq-key
```

### Database Setup

Run the SQL schema in your Supabase SQL Editor to create all required tables:

```sql
-- Tables: profiles, jobs, proposals, contracts, milestones,
-- messages, chat_rooms, chat_room_members, notifications,
-- disputes, reviews
```

### Run Development Server

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## User Roles

| Role | Capabilities |
|---|---|
| **Freelancer** | Browse jobs, submit proposals, track contracts, manage profile/skills/availability, chat + video call, submit deliverables, rate clients |
| **Client** | Post jobs, review proposals, hire freelancers, fund milestones, approve deliverables, chat + video call, rate freelancers |
| **Admin** | Full platform oversight, user/job management, dispute mediation, AI governance, analytics dashboards, moderate content |

### Admin Access

Admin accounts are created directly in the Supabase database:

```sql
-- Create admin profile after signup
UPDATE profiles SET role = 'admin' WHERE id = 'user-id-here';
```

---

## Key Workflows

### 1. Job → Contract → Payment
```
Client posts job (open) → Freelancer submits proposal →
Client accepts → Contract created (active) →
Client funds escrow → Freelancer works →
Freelancer submits deliverable → Client approves →
Contract completed → Invoice generated → Payment released
```

### 2. Real-Time Chat + Video
```
Contract created → Chat room auto-created →
Both parties can message in real-time →
Either party can start Jitsi video call with screen share →
Chat stays accessible (read-only after completion)
```

### 3. Dispute Resolution
```
Party flags milestone → Status: in_dispute →
Admin reviews deliverables + chat history →
Admin decides: Refund Client OR Release to Freelancer
```

---

## Currency Support

The platform supports dual currency display:

- **INR (₹)** — Primary for Indian freelancers/clients
- **USD ($)** — International standard
- Conversion rate: 1 USD = 83.5 INR (configurable)
- All amounts stored in their original currency
- Display shows: `₹25,000 ($300)` or `$2,500 (₹2,08,750)`

---

## Design System

- **Theme:** Linear-style dark (#0B0F17) with Light mode toggle
- **Accents:** Emerald (#10b981) / Cyan (#06b6d4)
- **Font:** YDYoonche L/M (headings) + System UI (body)
- **Cards:** Soft neumorphic with inset shadows (dark) / clean slate (light)
- **Responsive:** Full mobile + desktop support

---

## Build

```bash
# Production build
npm run build

# Preview production build
npm run preview
```

---

## License

© 2026 GENOSHA. All rights reserved.

---

**Built by human + AI** 🤖
