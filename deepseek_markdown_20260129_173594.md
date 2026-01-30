# LC Application Portal Backend API

## Base URL
`http://localhost:5000/api`

## Authentication
All endpoints except `/auth/*` require JWT authentication.

## Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user
- `POST /auth/forgot-password` - Request password reset
- `POST /auth/reset-password/:token` - Reset password

### Applications
- `GET /applications` - Get all applications
- `GET /applications/:id` - Get single application
- `POST /applications` - Create new application
- `PUT /applications/:id` - Update application
- `DELETE /applications/:id` - Delete application
- `PUT /applications/:id/step` - Update application step
- `POST /applications/:id/submit` - Submit application
- `GET /applications/stats/dashboard` - Get dashboard statistics

### Company
- `GET /company` - Get company info
- `POST /company` - Create/update company
- `PUT /company/:id` - Update company

### Documents
- `POST /documents/upload` - Upload document
- `GET /documents/application/:id` - Get application documents

### Notifications
- `GET /notifications` - Get user notifications
- `PUT /notifications/:id/read` - Mark as read

## Testing
Run the test suite:
```bash
npm test