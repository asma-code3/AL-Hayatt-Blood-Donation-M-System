# Blood Donation System Deployment

## Vercel Backend Deployment

Deploy the backend as its own Vercel project:

1. Import the repository in Vercel.
2. Set the project root directory to `backend`.
3. Add these environment variables in Vercel:

```powershell
NODE_ENV=production
MONGODB_URI=<your-production-mongodb-uri>
JWT_SECRET=<strong-random-secret>
FRONTEND_URL=<your-frontend-vercel-url>
ADMIN_USERNAME=<admin-username>
ADMIN_PASSWORD=<strong-admin-password>
DOCTOR_USERNAME=<doctor-username>
DOCTOR_PASSWORD=<strong-doctor-password>
STAFF_USERNAME=<staff-username>
STAFF_PASSWORD=<strong-staff-password>
LOG_REQUESTS=false
```

Use comma-separated values for `FRONTEND_URL` if you need to allow more than one frontend domain, for example:

```powershell
FRONTEND_URL=https://your-app.vercel.app,https://your-preview.vercel.app
```

After deployment, test:

- Backend root: `https://your-backend.vercel.app/`
- Health endpoint: `https://your-backend.vercel.app/api/health`

Set the frontend `VITE_API_URL` to the deployed backend URL, for example:

```powershell
VITE_API_URL=https://your-backend.vercel.app/api
```

## Docker Deployment

1. Create `backend/.env` from `backend/.env.example`.
2. Start the full stack:

```powershell
docker compose up --build -d
```

3. Open:

- Frontend: `http://localhost:8080`
- Backend health: `http://localhost:4000/api/health`

4. Stop the stack:

```powershell
docker compose down
```

## Backend

1. Copy `backend/.env.example` to `backend/.env`.
2. Set a real `JWT_SECRET`.
3. Set `MONGODB_URI` to a production database.
4. Set `FRONTEND_URL` to your deployed frontend origin.
5. Start with:

```powershell
cd backend
npm install
npm test
npm run cleanup:data
npm start
```

## Frontend

1. Install dependencies:

```powershell
cd frontend
npm install
```

2. Build for production:

```powershell
npm run build
```

3. Serve the generated `frontend/dist` with your preferred static host.
4. If frontend and backend are on different origins, set `VITE_API_URL` during build to the deployed backend API URL.

## Readiness Checklist

- `JWT_SECRET` is not the default placeholder.
- Production MongoDB database is reachable.
- `npm test` passes in `backend`.
- `npm run build` passes in `frontend`.
- `npm run cleanup:data` reports no unresolved critical issues.
- Admin/staff/doctor credentials are set from environment variables, not defaults.
- `docker compose up --build` starts both services successfully if using containers.
