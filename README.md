# Developer Connect

A developer community app built with React, Redux Toolkit, Express, and MongoDB. This is an original implementation inspired by the feature set of Brad Traversy's **MERN Stack Front To Back** course. It is not the instructor's source code or a claim of a live deployment.

## Features

- Register and sign in with hashed passwords and JSON Web Tokens
- Create a public profile with skills, bio, social links, experience, and education
- Browse and search developer profiles
- Publish and delete posts; like, comment on, and discuss posts
- Ownership checks for deletion, server validation, pagination, and basic auth rate limiting
- Responsive interface with React Hooks, React Router, and Redux Toolkit session state

## Requirements

- Node.js 24 and npm
- MongoDB running locally, or a MongoDB connection string

## Run locally

```bash
cp .env.example .env
# Edit .env: set MONGODB_URI and a unique JWT_SECRET with at least 32 characters.
npm install
npm run dev
```

Open **http://localhost:5173**. The Vite development server proxies `/api` to the Express server on port 5000. Start MongoDB separately. If using a hosted MongoDB instance, never commit credentials to git. `npm run build` builds the frontend; `npm test` runs server validation tests.

## API

| Area | Endpoints |
| --- | --- |
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Profiles | `GET /api/profiles`, `GET /api/profiles/:handle`, `GET/PUT /api/profiles/me` |
| History | `POST/DELETE /api/profiles/me/experience[/:id]`, equivalent education routes |
| Posts | `GET/POST /api/posts`, `DELETE /api/posts/:id`, `PUT /api/posts/:id/like`, `POST /api/posts/:id/comments`, `DELETE /api/posts/:id/comments/:commentId` |

Authenticated routes require `Authorization: Bearer <token>`. The client stores the token in local storage for this portfolio build; a production deployment should use an appropriate secure session design and HTTPS. The post list is capped at 20 items per page; developer directory is capped at 100 profiles. For a larger community, add server-side search and cursor pagination. External links are opened with `noopener noreferrer`.

## Project structure

```text
client/   React UI, Redux Toolkit session, Vite
server/   Express API, Mongoose models, validation
```

## Resume accuracy

This project includes the MERN stack, JWT authentication, Redux state, profiles, and a responsive UI. It has **not** been deployed to Heroku here. Production frontend serving, the Heroku build script, and a Procfile are included. See [HEROKU.md](HEROKU.md) to configure your database and deploy. Update the deployment bullet only after there is a working public URL.
