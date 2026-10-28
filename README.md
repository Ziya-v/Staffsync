# StaffSync

StaffSync is a full-stack HR workspace for HR personnel, managers, and employees. The project is organized into separate frontend and backend applications and uses React, Node.js, Express, MongoDB/Mongoose, and signed HS256 JWS authentication.

## Requirements

- Node.js 20.19 or later and npm
- MongoDB Community Server or a MongoDB Atlas connection (optional for local demo mode)
- A modern browser

## Project layout

```text
frontend/                 React and Vite web application
  src/                    Screens, role dashboards, and styles
  package.json            Frontend dependencies and scripts
  vite.config.js          Local API proxy to port 5000
backend/                  Node.js and Express API
  server/index.js         REST routes, JWS auth, Mongoose models, demo seeds
  .env.example            MongoDB and API configuration template
  package.json            Backend dependencies and scripts
README.md                 Setup and API notes
```

## Start the backend

Open a terminal in `backend/` and run:

```bash
npm install
```

Copy `.env.example` to `.env`. Set `MONGODB_URI` to your local or Atlas database and set `JWT_SECRET` to a private random value of at least 32 characters. Keep `ENABLE_DEMO_ACCESS=false` outside local evaluation.

```bash
npm run dev
```

The API listens on `http://localhost:5000`. In development, if `MONGODB_URI` is not set, StaffSync uses sample data in memory; those changes reset when the API restarts. Configure MongoDB to persist application data.

## Start the frontend

Open a second terminal in `frontend/` and run:

```bash
npm install
npm run dev
```

Open the Vite address (normally `http://localhost:5173`). The frontend proxies `/api` requests to the backend on port 5000. Keep both development processes running while using the app.

## Demo accounts

On the sign-in screen, select a role, use **Fill demo login**, then submit the form. Demo access still validates the account password and selected role.

| Role | Email | Password |
| --- | --- | --- |
| HR | `jordan@staffsync.demo` | `staffsync123` |
| Manager | `olivia@staffsync.demo` | `staffsync123` |
| Employee | `liam@staffsync.demo` | `staffsync123` |

## Production-style local run

Build the frontend first:

```bash
cd frontend
npm install
npm run build
```

Then start the backend from `backend/` with MongoDB and a strong `JWT_SECRET` configured:

```bash
npm install
npm start
```

The Express server serves the compiled frontend and API from port 5000. Production startup requires MongoDB and a strong signing secret.

## Backend overview

- `POST /api/auth/login` verifies email, password, and selected role, then issues a 12-hour HS256 JWS access token.
- Protected API routes require `Authorization: Bearer <token>`.
- HR manages employee accounts, company announcements, and leave decisions.
- Managers see their assigned team and can review that team’s leave requests.
- Employees can read their own profile and request leave, record attendance, and enroll in training.
- MongoDB stores users, employee profiles, leave requests, attendance, announcements, and training programs.
- `GET /api/health` reports API and database status.

Demo data is fictional. Before handling real HR data, configure backups, account recovery, audit logging, production CORS origins, and a managed identity provider.
