# Academic Analytics System — Decentralised v4.0

An enterprise-level full-stack web application designed for comprehensive college management, entirely decoupled from MongoDB, and running purely on **IPFS + Ethereum Blockchain** (Ganache).

## 🚀 Features
- **100% Decentralised Data**: User profiles, achievements, attendance, and marks are stored locally via IPFS/Pinata and indexed seamlessly on the blockchain.
- **Role-Based Access**: Student, Faculty, HOD, Principal, Admin.
- **Dashboards**: Customized UI views built with React & Recharts for each role.
- **Analytics & PDF Reports**: Generate custom class analytics right from the UI.
- **Email OTP Verification**: Secure two-step registration for students and faculty.
- **Smart Contract Verification**: Proof of Achievements tied immutably to a deployed Solidity Smart Contract.

---

## 🛠️ Prerequisites

Before you begin, install the following:

### 1. Node.js
- Download from: **[https://nodejs.org](https://nodejs.org)** (v18 or above)
- Verify installation:
  ```bash
  node -v
  npm -v
  ```

### 2. Ganache (Visual Blockchain)
- Download from: **[https://trufflesuite.com/ganache/](https://trufflesuite.com/ganache/)**
- Open Ganache and click **Quickstart**. 
- Leave it running. You will see 10 accounts and their balances. Make sure the RPC URL is `http://127.0.0.1:7545`.

---

## ⚙️ Environment Configuration

First, copy the repository, then create `.env` files in both the `backend` and `frontend` folders.

### Backend — `backend/.env`
Create this file inside the inside the `backend/` folder:

```env
PORT=5000
JWT_SECRET=replace_this_with_a_secure_secret_key
JWT_EXPIRE=30d
NODE_ENV=development

# Blockchain (Ganache local node)
BLOCKCHAIN_RPC_URL=http://127.0.0.1:7545

# IPFS Configuration
# Option 1: Development fallback (no account needed). Files are stored in backend/ipfs_local_store/
IPFS_PROVIDER=local
PINATA_API_KEY=
PINATA_SECRET_KEY=
IPFS_GATEWAY=https://gateway.pinata.cloud/ipfs/

# Cloudinary (Optional - for file uploads)
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# Email (Nodemailer for OTP - REPLACE with your Gmail App Password)
EMAIL_USER=your_email@gmail.com
EMAIL_PASS=your_app_password
```

### Frontend — `frontend/.env`
Create this file inside the `frontend/` folder:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## 💻 Installation Steps

Open a terminal in the main project folder (`academic-analytics-system`) and run:

### 1. Install Backend Dependencies
```bash
cd backend
npm install
```

### 2. Install Frontend Dependencies
```bash
cd ../frontend
npm install
```

---

## ▶️ Running the Application

You can either run the app manually using two terminals, or automatically using the master script.

### Method A: Manual Execution

**Terminal 1 — Backend:**
```bash
cd backend
npm start
```
> The backend automatically compiles and deploys the Solidity smart contract to Ganache upon boot!

**Terminal 2 — Frontend:**
```bash
cd frontend
npm run dev
```

### Method B: One-Click Master Script (Windows Only)

Double click the `start.ps1` script located in the root folder. It will:
1. Compile the smart contracts.
2. Start the Node.js backend server.
3. Start the Vite React frontend.

> **Frontend runs at:** `http://localhost:5173`

---

## 🔑 First-Time Setup (New System)

Since there is no MongoDB database, your local Blockchain and IPFS storage will be completely empty upon the first run.

Follow this setup order:
1. **Wait for Backend**: Let the backend terminal say _"Deploying new contract..."_. 
2. **Register an Admin account**: Go to `http://localhost:5173/register` and select "Admin".
3. **Login as Admin**: Approve departments and HODs.
4. **Login as HOD**: Go to Assign Roles, assign Course Teachers and Class Teachers.
5. **Students register**: Register with "Student" role.

---

## 🔗 How to View Blockchain Transactions & IPFS Files

- **Ganache**: Open the Ganache UI. Clicking the **Blocks** or **Transactions** tab will show you every single data mutation occurring in real-time as users save achievements, mark attendance, or update profiles!
- **MetaMask**: If you import Ganache Account #0 into your browser MetaMask extension, you can sign transactions manually.
- **IPFS**: Your profile pictures, attendance rosters, and achievement attachments will be saved as JSON hashes mapped onto the blockchain and stored in `backend/ipfs_local_store/`. 
