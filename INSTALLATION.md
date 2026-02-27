# 📘 Installation Guide — Academic Analytics System

## Prerequisites (Install in Order)

### 1. Node.js
- Download from: **https://nodejs.org** (choose LTS version, v18 or above)
- After install, verify in terminal:
  ```
  node -v
  npm -v
  ```

### 2. MongoDB Community Server
- Download from: **https://www.mongodb.com/try/download/community**
- Install with default settings
- Make sure **MongoDB service is running** after install
- (Optional) Install **MongoDB Compass** for a visual DB browser

---

## Project Files to Copy

Copy the project folder to the new system. **Skip `node_modules`** — these will be regenerated.

```
academic-analytics-system/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── utils/
│   ├── uploads/
│   ├── .env           ← create manually (see below)
│   ├── package.json
│   └── server.js
│
└── frontend/
    ├── public/
    ├── src/
    ├── .env           ← create manually (see below)
    ├── index.html
    ├── package.json
    └── vite.config.js
```

> ❌ Do NOT copy `node_modules/` from either folder

---

## Environment Configuration

### Backend — create `backend/.env`
```env
NODE_ENV=development
PORT=5000
MONGO_URI=mongodb://localhost:27017/academic-analytics
JWT_SECRET=srit_academic_secret_2024
JWT_EXPIRE=30d
```

### Frontend — create `frontend/.env`
```env
VITE_API_URL=http://localhost:5000/api
```

---

## Installation Steps

Open a terminal in the `academic-analytics-system` folder and run:

### Install Backend Dependencies
```bash
cd backend
npm install
```

### Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

## Running the Application

You need **two terminals open** simultaneously:

### Terminal 1 — Backend
```bash
cd backend
npm run dev
```
> Backend runs at: **http://localhost:5000**

### Terminal 2 — Frontend
```bash
cd frontend
npm run dev
```
> Frontend runs at: **http://localhost:5173**

Open your browser and go to: **http://localhost:5173**

---

## First-Time Setup (After Fresh Install)

The database will be empty on a new system. Follow this order:

1. **Register an Admin account** — go to `/register`, set role as Admin
2. **Login as Admin** — create HOD accounts for each department
3. **Login as HOD** — go to Assign Roles, create Faculty and ClassTeacher accounts
4. **Faculty registers** — or Admin creates faculty accounts
5. **Students register** — via `/register` with Student role

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `Cannot connect to MongoDB` | Make sure MongoDB service is running |
| `Port 5000 already in use` | Change `PORT` in `backend/.env` |
| `npm install` fails | Delete `package-lock.json` and retry |
| Blank page in browser | Check if backend is running on port 5000 |
| `JWT_SECRET` error | Make sure `.env` file exists in backend folder |
