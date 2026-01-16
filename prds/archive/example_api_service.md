# PRD: REST API Service with User Authentication

## Overview

Build a production-ready REST API service with user authentication, CRUD operations for a resource (blog posts), and proper error handling. This service will serve as the backend for a blogging platform.

## Goals

1. Create a fully functional REST API with standard endpoints
2. Implement secure user authentication (JWT-based)
3. Add CRUD operations for blog posts
4. Include comprehensive error handling and validation
5. Write integration tests for all endpoints
6. Document all API endpoints

## Target Directory

Create all code in `/output/src/`

## User Stories

### As an API consumer, I want to:
1. Register a new account with email and password
2. Log in to receive an authentication token
3. Create, read, update, and delete blog posts
4. Only modify my own blog posts
5. View all public blog posts without authentication
6. Receive clear error messages when something goes wrong

## Technical Requirements

### Stack
- **Language**: Node.js with TypeScript
- **Framework**: Express.js
- **Database**: PostgreSQL with Prisma ORM
- **Authentication**: JWT tokens
- **Validation**: Zod for request validation
- **Testing**: Jest + Supertest

### API Endpoints

#### Authentication
```
POST /api/auth/register
  Body: { email, password, name }
  Response: { user, token }

POST /api/auth/login
  Body: { email, password }
  Response: { user, token }
```

#### Blog Posts
```
GET /api/posts
  Auth: Optional
  Response: { posts: Post[] }

GET /api/posts/:id
  Auth: Optional
  Response: { post: Post }

POST /api/posts
  Auth: Required
  Body: { title, content, published }
  Response: { post: Post }

PUT /api/posts/:id
  Auth: Required (must be owner)
  Body: { title?, content?, published? }
  Response: { post: Post }

DELETE /api/posts/:id
  Auth: Required (must be owner)
  Response: { success: true }
```

### Data Models

```typescript
// User
{
  id: string (UUID)
  email: string (unique)
  password: string (hashed)
  name: string
  createdAt: Date
  updatedAt: Date
}

// Post
{
  id: string (UUID)
  title: string
  content: string
  published: boolean
  authorId: string (foreign key to User)
  createdAt: Date
  updatedAt: Date
}
```

### Security Requirements
- Passwords must be hashed with bcrypt (minimum 10 rounds)
- JWT tokens expire after 7 days
- Protected routes must validate JWT token
- Users can only modify their own posts
- SQL injection prevention via Prisma parameterized queries
- Rate limiting on authentication endpoints (5 requests per minute)

### Error Handling
- Return consistent error response format:
  ```json
  {
    "error": {
      "message": "Description of error",
      "code": "ERROR_CODE",
      "status": 400
    }
  }
  ```
- Use appropriate HTTP status codes:
  - 200: Success
  - 201: Created
  - 400: Bad Request (validation errors)
  - 401: Unauthorized
  - 403: Forbidden
  - 404: Not Found
  - 500: Internal Server Error

### File Structure
```
output/src/
├── app.ts                 # Express app setup
├── server.ts              # Server entry point
├── config/
│   ├── database.ts        # Prisma client
│   └── jwt.ts            # JWT configuration
├── middleware/
│   ├── auth.ts           # JWT authentication middleware
│   ├── errorHandler.ts   # Global error handler
│   └── validation.ts     # Request validation middleware
├── routes/
│   ├── auth.routes.ts    # Authentication routes
│   └── posts.routes.ts   # Blog post routes
├── controllers/
│   ├── auth.controller.ts
│   └── posts.controller.ts
├── services/
│   ├── auth.service.ts
│   └── posts.service.ts
├── models/
│   └── schema.prisma     # Prisma schema
├── validators/
│   ├── auth.validator.ts
│   └── posts.validator.ts
├── utils/
│   ├── password.ts       # Password hashing utilities
│   └── jwt.ts           # JWT utilities
└── __tests__/
    ├── auth.test.ts
    └── posts.test.ts
```

## Acceptance Criteria

### Must Have
- [ ] All 7 API endpoints implemented and working
- [ ] User registration with email validation and password hashing
- [ ] JWT authentication on protected routes
- [ ] Users can only modify their own posts
- [ ] Comprehensive error handling with appropriate status codes
- [ ] Request validation using Zod schemas
- [ ] Integration tests with >80% code coverage
- [ ] Database migrations via Prisma
- [ ] README with API documentation and setup instructions

### Should Have
- [ ] Rate limiting on auth endpoints
- [ ] Request logging (Morgan or similar)
- [ ] Environment variable configuration (.env support)
- [ ] API documentation (Swagger/OpenAPI)

### Nice to Have
- [ ] Pagination for GET /api/posts
- [ ] Filtering posts by author
- [ ] Search functionality for posts

## Out of Scope

- Frontend implementation (API only)
- Email verification for registration
- Password reset functionality
- OAuth integration (Google, GitHub)
- File uploads for blog post images
- Comments on blog posts
- Deployment configuration

## Success Metrics

- All API endpoints return in <200ms
- 100% of tests pass
- No security vulnerabilities in npm audit
- Code passes TypeScript strict mode
- ESLint shows no errors

## Implementation Notes

### Database Setup
```bash
# Initialize Prisma
npx prisma init

# Create migration
npx prisma migrate dev --name init

# Generate Prisma client
npx prisma generate
```

### Environment Variables
```env
DATABASE_URL="postgresql://user:pass@localhost:5432/blog"
JWT_SECRET="your-secret-key-here"
JWT_EXPIRY="7d"
PORT=3000
NODE_ENV="development"
```

### Testing Strategy
1. Unit tests for utility functions (password hashing, JWT)
2. Integration tests for all API endpoints
3. Test authentication middleware
4. Test validation schemas
5. Test error handling

### Common Pitfalls to Avoid
- Don't return password hash in API responses
- Don't allow users to modify authorId when creating posts
- Always validate and sanitize user input
- Use transactions for multi-step operations
- Handle database connection errors gracefully

## Priority

**High** - This is a foundational service that needs to be production-ready.

## Estimated Complexity

**Medium** - Standard REST API patterns with authentication.

Expected implementation time: 4-6 iterations
