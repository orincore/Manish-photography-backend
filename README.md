# Manish Photography Backend

A professional, scalable, and secure Node.js backend for a photography portfolio website.

## Tech Stack
- Node.js + Express.js
- Supabase (PostgreSQL, custom auth)
- Cloudinary (image storage)
- bcrypt, JWT (auth)
- Zod (validation)
- Multer (file handling)
- Render.com (deployment)

## Folder Structure
```
src/
  config/           # Supabase, Cloudinary, JWT configs
  controllers/      # Route logic
  middlewares/      # Auth, error handling
  routes/           # API route definitions
  services/         # Cloudinary, Supabase interactions
  utils/            # Helpers
  app.js            # Express setup
  server.js         # Entry point
.env                # Environment variables
```

## Setup Instructions
1. Clone the repo and install dependencies:
   ```sh
   npm install
   ```
2. Create a `.env` file in the root with the following variables:
   ```env
   # Supabase
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

   # Cloudinary
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret

   # JWT
   JWT_SECRET=your_jwt_secret
   JWT_EXPIRES_IN=1d
   ADMIN_EMAIL=your_admin_email
   ADMIN_PASSWORD=your_admin_password
   ```
3. Start the server:
   ```sh
   npm start
   ```

## Deployment
- Ready for Render.com deployment.

## Features
- Admin and client authentication (custom, secure)
- Portfolio management (CRUD)
- Feedback and ratings (approval system)
- Contact form submissions
- Cloudinary image uploads
- Role-based route protection
- Input validation and sanitization

---

For Supabase schema setup, see `/docs/supabase-schema.sql` (to be provided after backend setup). 