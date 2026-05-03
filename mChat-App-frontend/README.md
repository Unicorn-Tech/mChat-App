# mChat Frontend

React/Vite frontend for the mChat real-time messaging app.

## Stack

- React 19
- Vite
- Redux Toolkit
- Redux Saga
- React Router
- Axios
- Socket.IO Client
- React Hot Toast
- React Icons

## Main Screens

- Login: `/messenger/login`
- Register: `/messenger/register`
- Chat: `/messenger`

The chat screen includes direct conversation search, online status, read receipts, conversation search, profile panel, local mute state, and responsive desktop/mobile layout.

## Environment

Defaults:

```text
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=<derived from VITE_API_URL>
```

Optional `.env`:

```env
VITE_API_URL=http://localhost:3000/api
VITE_SOCKET_URL=http://localhost:3000
```

## Install

```bash
npm install
```

## Scripts

```bash
npm run start    # start Vite dev server
npm run build    # build production assets
npm run lint     # run ESLint
npm run preview  # preview production build
```

## Local Development

Start the backend first from `../mChat-App-backend`, then run:

```bash
npm run start
```

Open:

```text
http://127.0.0.1:5173/
```

## Source Layout

```text
src/
  app/          Redux store, root saga, auth bootstrap
  components/   Route guards and reusable components
  css/          Page-specific CSS
  features/     Auth, user, and chat state/API/sagas
  hooks/        Typed Redux hooks
  pages/        Login, register, and chat pages
  services/     Axios client and Socket.IO client
```

## Verification

```bash
npm run lint
npm run build
```

The production build is written to `dist/`.
