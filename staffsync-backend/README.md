# StaffSync Backend

Express + MongoDB REST API designed to work with the existing Vite proxy (`/api` -> `http://localhost:5000`).

## Requirements
- Node.js 20.19+ (your Vite project already declares this requirement)
- MongoDB running locally, or a MongoDB Atlas connection string

## Run on Windows
1. Extract this folder into your project, e.g. `staffsync/backend`.
2. Open a terminal inside `backend`.
3. Install dependencies:
   ```bash
   npm install
   ```
4. Copy `.env.example` to `.env` and set a strong random `JWT_SECRET` (at least 32 characters) and your MongoDB connection string.
5. Start the API:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:5000/api/health`. Expected response: `{"status":"ok","service":"StaffSync API"}`.

## API endpoints
All endpoints except health, register and login require `Authorization: Bearer <token>`.

- `GET /api/health`
- `POST /api/auth/register` `{ "name": "Demo Employee", "email": "employee@example.com", "password": "StrongPass123" }`
- `POST /api/auth/login` `{ "email": "employee@example.com", "password": "StrongPass123" }`
- `GET /api/auth/me`
- `GET /api/dashboard`
- `GET, POST /api/employees`
- `PATCH, DELETE /api/employees/:id` (DELETE deactivates)
- `GET, POST /api/leaves`
- `PATCH /api/leaves/:id/status` `{ "status": "approved" | "rejected" }`
- `GET /api/attendance`
- `POST /api/attendance/check-in` `{ "employee": "<Employee MongoDB ID>" }`
- `PATCH /api/attendance/:id/check-out`
- `GET, POST /api/tasks`
- `PATCH, DELETE /api/tasks/:id`

## Important notes
- Public registration always creates an `employee`; do not let clients choose their own admin/HR role.
- To create the first admin, use a controlled one-time seed script or update the role through a trusted database admin session. Do not expose admin creation publicly.
- This is a starter backend. Before production, add request validation, audit logs, pagination, stronger authorization scoping, password reset, refresh-token/session revocation, and tests.
- Attendance check-in currently expects an employee MongoDB ID. Connect your authenticated user to an employee record before exposing this action to employees.
- Match field names to your actual React forms/components before wiring all screens.
