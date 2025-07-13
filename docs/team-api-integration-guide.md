# Team API Integration Guide

This guide explains how to integrate the Team API for managing and displaying team members in your application.

---

## 1. Prerequisites
- Backend server running (see README for setup)
- Supabase table `team_members` created (see SQL in previous instructions)
- Admin JWT token for protected endpoints
- Cloudinary configured for photo uploads

---

## 2. Authentication
- **Public endpoints** (GET) do not require authentication.
- **Admin endpoints** (POST, PUT, DELETE) require a Bearer JWT token in the `Authorization` header.

```
Authorization: Bearer <your_admin_jwt_token>
```

---

## 3. API Endpoints

### List All Team Members
```
GET /api/team
```
- Query param: `active=true` (optional, only active members)

**Example Response:**
```json
{
  "message": "Team members fetched successfully",
  "members": [
    {
      "id": "...",
      "name": "John Doe",
      "role": "Photographer",
      "photo_url": "https://...",
      "bio": "Expert in wedding photography.",
      "order_index": 1,
      "is_active": true,
      "created_at": "...",
      "updated_at": "..."
    }
  ]
}
```

### Get Team Member by ID
```
GET /api/team/:id
```

### Create Team Member (Admin)
```
POST /api/team
Content-Type: multipart/form-data
```
- Fields: `name` (required), `role` (required), `bio`, `order_index`, `is_active`, `photo` (file)

**Example cURL:**
```
curl -X POST {{base_url}}/api/team \
  -H "Authorization: Bearer <admin_token>" \
  -F "name=John Doe" \
  -F "role=Photographer" \
  -F "bio=Expert in wedding photography." \
  -F "order_index=1" \
  -F "is_active=true" \
  -F "photo=@/path/to/photo.jpg"
```

### Update Team Member (Admin)
```
PUT /api/team/:id
Content-Type: multipart/form-data
```
- Same fields as create. Only send fields you want to update.

### Delete Team Member (Admin)
```
DELETE /api/team/:id
```

---

## 4. Integration Logic (Frontend Example)

### Fetch and Display Team Members
```js
fetch('/api/team?active=true')
  .then(res => res.json())
  .then(data => {
    // data.members is an array of team members
    // Render in your UI
  });
```

### Add/Edit Team Member (Admin Panel)
- Use a form with fields: name, role, bio, order_index, is_active, photo (file input)
- Submit as `multipart/form-data` with JWT token in header

### Delete Team Member (Admin Panel)
- Send a DELETE request with JWT token

---

## 5. Best Practices
- Always validate user input on both frontend and backend
- Use `order_index` to control display order
- Use `is_active` to soft-hide members without deleting
- Optimize photo uploads (max 800x800px, JPG/PNG/WEBP)
- Secure admin endpoints with JWT and role checks

---

## 6. Postman Collection
- Use the provided `docs/team-api.postman_collection.json` for quick testing

---

## 7. Troubleshooting
- 401 Unauthorized: Check your JWT token and permissions
- 400 Bad Request: Check required fields and file types
- 413 Payload Too Large: Photo exceeds 10MB limit
- 404 Not Found: Invalid team member ID

---

For further help, contact the backend maintainer or check the backend logs for error details. 