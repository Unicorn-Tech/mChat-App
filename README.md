# mChat-App

mChat is a full-stack real-time messaging application with a React/Vite frontend and an Express/MongoDB backend. It supports email/password authentication, direct chats, live Socket.IO messaging, online presence, message read receipts, user search, profile avatars, and responsive chat UI.

## Project Structure

```text
mChat-App/
  mChat-App-backend/    Express API, MongoDB models, Socket.IO server
  mChat-App-frontend/   React app, Redux Toolkit, Redux Saga, Vite
```

## Tech Stack

- Frontend: React 19, Vite, Redux Toolkit, Redux Saga, Axios, Socket.IO Client, React Router
- Backend: Node.js, Express 5, MongoDB, Mongoose, Socket.IO, JWT, bcrypt
- Styling: CSS modules by page, React Icons

## Features

- Register and login with JWT-backed authentication
- Persisted auth bootstrap from local storage and `/api/auth/me`
- Search users and start direct conversations
- Real-time message delivery with Socket.IO
- Online/offline presence and last-seen display
- Read receipts for sent messages
- Conversation search, profile panel, local mute state, loading and empty states
- Responsive layout for desktop and mobile
- Backend health checks for API and database status

## Prerequisites

- Node.js 20 or newer recommended
- npm
- MongoDB running locally or a MongoDB connection string

By default, the backend connects to:

```text
mongodb://localhost:27017/mchat-app
```

## Environment Variables

Create `mChat-App-backend/.env` when you need non-default settings:

```env
PORT=3000
NODE_ENV=development
DB_URI=mongodb://localhost:27017/mchat-app
JWT_SECRET=change-me
JWT_EXPIRY=1h
JWT_REFRESH_SECRET=change-me
JWT_REFRESH_EXPIRY=7d
CORS_ORIGIN=http://127.0.0.1:5173,http://localhost:5173
```

Create `mChat-App-frontend/.env` when the API is not on the default port:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Install

```bash
cd mChat-App-backend
npm install

cd ../mChat-App-frontend
npm install
```

## Run Locally

Start the backend:

```bash
cd mChat-App-backend
npm start
```

Start the frontend:

```bash
cd mChat-App-frontend
npm run start
```

Open:

```text
http://127.0.0.1:5173/
```

The backend also has a combined dev command:

```bash
cd mChat-App-backend
npm run dev
```

## Useful Scripts

Backend:

```bash
npm start        # run the API server
npm run dev      # run backend and frontend together via concurrently
npm run dev:server
```

Frontend:

```bash
npm run start    # Vite dev server
npm run build    # production build
npm run lint     # ESLint
npm run preview  # preview production build
```

## API Overview

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Users and chats:

- `GET /api/users?q=<query>&limit=<n>`
- `GET /api/chats`
- `POST /api/chats/direct`
- `POST /api/chats/group`

Messages:

- `GET /api/messages/:chatId`
- `POST /api/messages/:chatId`
- `PUT /api/messages/:chatId/read`

Health:

- `GET /health`
- `GET /health/db`

## Socket Events

Client emits:

- `authenticate`
- `joinChat`
- `sendMessage`
- `markAsRead`

Server emits:

- `onlineUsers`
- `newMessage`
- `messagesRead`

## Verification

Recommended checks before committing changes:

```bash
cd mChat-App-frontend
npm run lint
npm run build

cd ../mChat-App-backend
node --check server.js
node --check src/app.js
```

Runtime health checks:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/health/db
```

## Notes

- The frontend defaults to `http://localhost:3000/api`.
- The Socket.IO client derives its URL from `VITE_API_URL` unless `VITE_SOCKET_URL` is set.
- User avatars are stored as image URLs or resized data URLs.
- Muted chat state is currently stored locally in the browser.
