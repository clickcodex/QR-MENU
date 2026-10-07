# MOMO MENU (QR-MENU)

> **Contactless Digital Table QR Menu & Multi-Role Restaurant Ordering Platform**  
> *Developed for ClickCodeX*

MOMO MENU solves the physical menu bottleneck in restaurants. When large groups sit down, everyone scans the small QR code on their table using their phone camera and immediately browses the full restaurant menu, adds dishes to their table cart, and places live orders.

No app download, no app store, no customer login or registration required.

---

## 🌟 Key Features

### 1. 📱 Customer Table Experience
- **Instant Camera QR Scan**: Scans table QR code (e.g., `/r/urban-spice/t/7`) and opens the live menu instantly.
- **Multi-Round Table Ordering**: Diners can order starters, review bill totals, add special cooking instructions, and order subsequent rounds without losing their active table session.
- **Real-Time Order Tracking**: Diners watch their order progress live through the official `OrderStatusPath` lifecycle:
  `PENDING` ➔ `ACCEPTED` ➔ `PREPARING` ➔ `READY` ➔ `SERVED` ➔ `COMPLETED`
- **Zero-Friction Hospitality UI**: Clean, light cream aesthetic (`#FAFAF8`), vegetarian/non-vegetarian dietary tags, category filter pill bar, and search.

### 2. 👨‍🍳 Kitchen Station (KDS)
- **Audio Chime Alerts**: Real-time ding-dong sound alert whenever a new order is received from any table.
- **Live Ticket Pipeline**: Dedicated kitchen dashboard for chefs to review table numbers, dishes, quantities, and cooking notes.
- **Strict Role Boundaries**: Kitchen staff can progress orders from `PENDING` through `ACCEPTED`, `PREPARING`, `READY`, and `SERVED` (delivered to table). Kitchen staff are restricted from settling bills (`COMPLETED`), which is reserved for Admin.

### 3. 💼 Owner Admin & Billing Radar
- **Live Table Radar**: Real-time view of all table orders, revenue, GST tax calculations, and status progression.
- **Settlement & Print Receipts**: One-click printable thermal POS bills with GST breakdown.
- **Table & Menu Management**: Add/edit categories, dishes, prices, photos, and generate printable table QR stands with instant download.

### 4. 👑 Super Admin Platform
- **SaaS Subscription Management**: Control restaurant subscriptions, active/inactive statuses, and expiry dates.
- **Credential & Access Control**: Super Admin can reset or reassign passwords for any owner or kitchen account.

---

## 🔑 Demo Credentials

| Role | Login URL | Email | Password |
|---|---|---|---|
| **Super Admin** | `/superadmin` | `superadmin@momomenu.in` | `superadmin123` |
| **Restaurant Owner** | `/admin/login` | `owner@urbanspice.in` | `owner123` |
| **Kitchen Staff** | `/kitchen/login` | `kitchen@urbanspice.in` | `kitchen123` |

---

## 🚀 Quick Start Guide

### 1. Clone & Install
```bash
git clone https://github.com/clickcodex/QR-MENU.git
cd QR-MENU
npm install
```

### 2. Environment Setup
Copy the sample environment file:
```bash
cp .env.example .env
```

### 3. Database Migration & Seeding
```bash
npx prisma db push
npm run seed
```

### 4. Start Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the homepage, or test a diner scanning Table 7 at [http://localhost:3000/r/urban-spice/t/7](http://localhost:3000/r/urban-spice/t/7).

---

## 🛠️ Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database & ORM**: SQLite / PostgreSQL via Prisma ORM
- **Authentication**: JWT & HTTP-Only Secure Cookies with Role-Based Access Control
- **QR Engine**: Canvas QR Code generation with automated dynamic host resolution
- **Audio**: Web Audio API synthesized kitchen chimes

---

## 📄 License
MIT License. Created by ClickCodeX.
