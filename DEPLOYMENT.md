# Deployment Guide

## Backend (Render / Railway)

### Prerequisites
- GitHub Repository with project code.
- Cloudinary Account.
- MongoDB Atlas Cluster.

### Steps
1. **Push Code to GitHub**: Ensure `backend` and `frontend` are in the repo.
2. **Create New Web Service** on Render/Railway.
3. **Root Directory**: Set to `backend`.
4. **Build Command**: `npm install`
5. **Start Command**: `node server.js`
6. **Environment Variables**:
   - `NODE_ENV`: production
   - `MONGO_URI`: Your Atlas Connection String
   - `JWT_SECRET`: Secure Random String
   - `CLOUDINARY_xxx`: Your Cloudinary Keys

## Frontend (Vercel)

### Steps
1. **Import Project** in Vercel.
2. **Root Directory**: Set to `frontend`.
3. **Build Command**: `vite build` (or `npm run build`)
4. **Output Directory**: `dist`
5. **Environment Variables**:
   - `VITE_API_URL`: The URL of your deployed Backend (e.g., `https://api.your-backend.com/api`)

## MongoDB Atlas Setup
1. Create Cluster.
2. Create Database User (Username/Password).
3. Whitelist Network Access (0.0.0.0/0 for anywhere).
4. Get Connection String: `mongodb+srv://<username>:<password>@cluster.mongodb.net/dbname`
