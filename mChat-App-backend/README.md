# mChat Backend

Backend service for the mChat real-time messaging app. It provides REST APIs for authentication, users, chats, and messages, plus Socket.IO events for live messaging, online presence, and read receipts.

## Technology Used

- Node.js with CommonJS modules
- Express 5 for HTTP APIs
- MongoDB with Mongoose models
- Socket.IO for real-time chat
- JWT for access and refresh tokens
- bcrypt for password hashing
- express-validator for request validation
- helmet, cors, compression, morgan, rate limiting, and cookie-parser for app middleware

## Folder Structure

```text
mChat-App-backend/
  config/
    config.js              Environment-backed app configuration
  src/
    app.js                 Express app factory and middleware setup
    db/
      connect.js           MongoDB connection helper
    middleware/
      auth.js              JWT auth guard
      validate.js          express-validator result handler
    models/
      User.js              User schema and password helpers
      Chat.js              Chat schema
      Message.js           Message and attachment schema
    controllers/
      authController.js    Register, login, refresh, logout, me
      userController.js    User search/listing
      chatController.js    Chat listing and creation
      messageController.js Message listing, sending, read status
    routes/
      auth.js              /api/auth routes
      users.js             /api/users routes
      chats.js             /api/chats routes
      messages.js          /api/messages routes
    utils/
      asyncHandler.js      Async controller error wrapper
      jwt.js               JWT sign/verify helpers
  server.js                Database connection, HTTP server, Socket.IO setup
```

## Application Entry Flow

1. `server.js` loads environment variables and imports config.
2. `connectToDb(DB_URI)` connects Mongoose to MongoDB.
3. `createApp()` from `src/app.js` builds the Express app.
4. `app.listen(PORT)` starts the HTTP server.
5. Socket.IO is attached to the same server.
6. Shared runtime state is stored on the Express app:
   - `io`: Socket.IO server instance
   - `onlineUsers`: map of `userId -> socket ids`

## Express App Flow

`src/app.js` creates the API pipeline:

```text
request
  -> security/performance middleware
  -> request parsing
  -> rate limiting
  -> request logging
  -> health routes
  -> API routers
  -> 404 handler
  -> centralized error handler
```

Mounted routers:

- `/api/auth`
- `/api/users`
- `/api/chats`
- `/api/messages`

Health routes:

- `GET /health`: confirms the API process is alive
- `GET /health/db`: confirms MongoDB connection state

## Authentication Flow

### Register

Route:

```text
POST /api/auth/register
```

Flow:

1. `routes/auth.js` validates `name`, `email`, `password`, and optional `avatarUrl`.
2. `validate` middleware returns `422` when validation fails.
3. `authController.register` normalizes email to lowercase.
4. It checks if the email already exists.
5. A `User` document is created.
6. `user.setPassword(password)` hashes the password with bcrypt.
7. Access and refresh JWTs are signed.
8. Tokens are set as HTTP-only cookies and also returned in JSON.

### Login

Route:

```text
POST /api/auth/login
```

Flow:

1. Request body is validated.
2. Email is normalized to lowercase.
3. User is loaded with `passwordHash`.
4. `user.verifyPassword(password)` compares the password using bcrypt.
5. Access and refresh tokens are issued.
6. Safe user data and tokens are returned.

### Protected Routes

Protected APIs use `requireAuth` from `src/middleware/auth.js`.

Flow:

1. Reads token from `Authorization: Bearer <token>` or `accessToken` cookie.
2. Verifies token with `JWT_SECRET`.
3. Loads the user from MongoDB.
4. Attaches user to `req.user`.
5. Continues to controller.

## Data Models

### User

File: `src/models/User.js`

Important fields:

- `name`
- `email`
- `passwordHash`
- `avatarUrl`
- `status`: `online` or `offline`
- `lastSeenAt`

Important methods:

- `setPassword(password)`: hashes and stores password
- `verifyPassword(password)`: compares password
- `toSafeJSON()`: returns user data without password hash

### Chat

File: `src/models/Chat.js`

Important fields:

- `isGroup`
- `name`
- `members`
- `admins`
- `lastMessage`

Direct chats are stored as non-group chats with exactly two members.

### Message

File: `src/models/Message.js`

Important fields:

- `chat`
- `sender`
- `text`
- `attachments`
- `readBy`
- timestamps

Messages are indexed by `chat` and `createdAt` for efficient chat history loading.

## Chat Flow

### Load My Chats

Route:

```text
GET /api/chats
```

Flow:

1. `requireAuth` attaches `req.user`.
2. `chatController.myChats` finds chats where `members` includes current user.
3. Members and last message are populated.
4. Invalid one-member direct chats are filtered out.
5. `enrichChatForUser` adds `directPartner` for direct chats.
6. Chats are returned sorted by most recent update.

### Create Direct Chat

Route:

```text
POST /api/chats/direct
```

Expected body:

```json
{
  "userId": "target-user-id"
}
```

or:

```json
{
  "email": "target@example.com"
}
```

Flow:

1. Target user is resolved by email or user id.
2. The controller prevents chatting with yourself.
3. It checks for an existing direct chat with exactly those two members.
4. If found, it returns the existing chat.
5. If not found, it creates a new direct chat.
6. Members are populated and `directPartner` is added.

## Message Flow

### List Messages

Route:

```text
GET /api/messages/:chatId?limit=50&before=<date>
```

Flow:

1. `chatId` is validated as a MongoDB ObjectId.
2. `ensureMember` verifies the current user belongs to the chat.
3. Messages are queried by chat.
4. Results are sorted newest-first in the database, limited, then reversed before returning.

### Send Message by REST

Route:

```text
POST /api/messages/:chatId
```

Expected body:

```json
{
  "text": "Hello"
}
```

Flow:

1. The user is authenticated.
2. The user must be a chat member.
3. Empty messages are rejected unless attachments exist.
4. The message is created with sender in `readBy`.
5. The chat `lastMessage` is updated.
6. Online member sockets receive `newMessage`.
7. Created message is returned.

### Mark Messages as Read

Route:

```text
PUT /api/messages/:chatId/read
```

Flow:

1. User must be a chat member.
2. Messages in the chat add the current user to `readBy`.
3. `$addToSet` is used to avoid duplicate read receipt entries.
4. REST route returns `204`.

## Socket.IO Flow

Socket setup lives in `server.js`.

### Authenticate Socket

Event:

```text
authenticate
```

Client sends:

```json
{
  "token": "access-token"
}
```

Flow:

1. Token is verified.
2. `socket.userId` is set.
3. Socket id is stored in `onlineUsers`.
4. User status is set to `online`.
5. Socket joins all chat rooms for that user.
6. Server emits updated `onlineUsers`.

### Join Chat

Event:

```text
joinChat
```

Flow:

1. User must already be socket-authenticated.
2. Chat is loaded.
3. Membership is checked.
4. Socket joins the chat room.

### Send Message by Socket

Event:

```text
sendMessage
```

Client sends:

```json
{
  "chatId": "chat-id",
  "text": "Hello",
  "clientTempId": "temp-id-from-client"
}
```

Flow:

1. Socket must be authenticated.
2. Text and chat id are validated.
3. Chat is loaded and membership is checked.
4. Message is created.
5. Chat `lastMessage` is updated.
6. Message sender is populated.
7. Server emits `newMessage` to every online member socket.
8. Callback returns the saved message, chat data, and `clientTempId`.

The frontend uses `clientTempId` to replace an optimistic local message with the saved database message.

### Mark as Read by Socket

Event:

```text
markAsRead
```

Flow:

1. Socket must be authenticated.
2. User must be a chat member.
3. Current user is added to message `readBy`.
4. Server emits `messagesRead` to the chat room.

### Disconnect

Flow:

1. Socket id is removed from the user's socket set.
2. If the user has no active sockets, status becomes `offline`.
3. `lastSeenAt` is updated.
4. Updated `onlineUsers` is emitted.

## Route Summary

### Auth

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `POST /api/auth/logout`
- `GET /api/auth/me`

### Users

- `GET /api/users?q=<query>&limit=<n>`

### Chats

- `GET /api/chats`
- `POST /api/chats/direct`
- `POST /api/chats/group`

### Messages

- `GET /api/messages/:chatId`
- `POST /api/messages/:chatId`
- `PUT /api/messages/:chatId/read`

## Error Handling

Controllers are wrapped with `asyncHandler`, which forwards rejected promises to Express error middleware.

The final error handler in `src/app.js` returns:

```json
{
  "error": "Error message"
}
```

In non-production mode, stack traces are included to simplify debugging.

Validation errors include a `details` array from `express-validator`.

## Environment Variables

See `.env.example`.

Important values:

```env
PORT=3000
NODE_ENV=development
DB_URI=mongodb://localhost:27017/mchat-app
CORS_ORIGIN=http://localhost:5173,http://127.0.0.1:5173
JWT_SECRET=change-me
JWT_EXPIRY=1h
JWT_REFRESH_SECRET=change-me
JWT_REFRESH_EXPIRY=7d
```

Use strong JWT secrets outside local development.

## Scripts

```bash
npm start        # run server.js with NODE_ENV=production
npm run dev      # run backend and frontend together
npm run dev:server
npm run client
```

## Local Run

```bash
npm install
npm start
```

Default backend URL:

```text
http://localhost:3000
```

Health checks:

```bash
curl http://127.0.0.1:3000/health
curl http://127.0.0.1:3000/health/db
```

## Development Checks

There is no backend test script currently. Useful syntax checks:

```bash
node --check server.js
node --check src/app.js
node --check src/controllers/authController.js
node --check src/controllers/chatController.js
node --check src/controllers/messageController.js
node --check src/controllers/userController.js
```
