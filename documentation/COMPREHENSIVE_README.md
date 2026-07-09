# Server Boilerplate TypeScript - Comprehensive Documentation

## 🚀 Overview

A robust, enterprise-grade **Node.js TypeScript server boilerplate** featuring **GraphQL**, **REST API**, and comprehensive user management. Built with modern architectural patterns, this boilerplate provides a complete foundation for building scalable web applications with authentication, role-based access control, event management, and real-time notifications.

## 📋 Table of Contents

1. [Features](#-features)
2. [Tech Stack](#-tech-stack)
3. [Prerequisites](#-prerequisites)
4. [Installation](#-installation)
5. [Configuration](#-configuration)
6. [Development](#-development)
7. [Production Deployment](#-production-deployment)
8. [Project Structure](#-project-structure)
9. [API Documentation](#-api-documentation)
10. [Authentication & Authorization](#-authentication--authorization)
11. [Database Management](#-database-management)
12. [Testing](#-testing)
13. [Monitoring & Logging](#-monitoring--logging)
14. [Performance Optimization](#-performance-optimization)
15. [Security](#-security)
16. [Contributing](#-contributing)
17. [License](#-license)

## ✨ Features

### Core Features
- 🎯 **Dual API Support**: GraphQL and REST API endpoints
- 🔐 **Complete Authentication System**: JWT-based auth with refresh tokens
- 👥 **User Management**: Comprehensive user and admin management
- 🛡️ **Role-Based Access Control (RBAC)**: Fine-grained permissions system
- 📧 **Multi-channel Notifications**: Email, SMS, push, and in-app notifications
- 📅 **Event Management**: Create, manage, and invite users to events
- 🌍 **Internationalization**: Multi-language support with dynamic UI labels
- 📊 **Configuration Management**: Dynamic application configuration
- 🔄 **Background Job Processing**: Queue-based job processing with Bull MQ

### Technical Features
- ⚡ **TypeScript**: Full type safety and modern JavaScript features
- 🗄️ **PostgreSQL**: Robust relational database with Sequelize ORM
- 🚀 **Redis**: Caching and session management
- 🔍 **ElasticSearch**: Advanced search capabilities (optional)
- 📁 **File Storage**: AWS S3 integration with CloudFront CDN
- 🔥 **Firebase**: Firebase Authentication integration
- 📱 **SMS Integration**: Twilio and MSG91 support
- 📧 **Email Services**: SendBay email provider integration
- 🎯 **Real-time Communication**: Pusher integration for live updates
- 📊 **Monitoring**: Sentry error tracking and performance monitoring

### Security Features
- 🛡️ **Rate Limiting**: Configurable request rate limiting
- ⏰ **Timestamp Validation**: Request timestamp verification
- 🔒 **Data Encryption**: Password hashing and data encryption
- 🔐 **OTP Verification**: Two-factor authentication support
- 🚫 **GraphQL Security**: Query depth limiting, complexity analysis
- 🔗 **CORS Configuration**: Secure cross-origin resource sharing

## 🛠 Tech Stack

### Backend Core
- **Runtime**: Node.js 22.16+
- **Language**: TypeScript 5.8+
- **Framework**: Express.js 4.21+
- **GraphQL**: Apollo Server 4.12+
- **API Documentation**: GraphQL Schema + Custom documentation

### Database & Storage
- **Database**: PostgreSQL 14+
- **ORM**: Sequelize 6.37+
- **Caching**: Redis 6+
- **Search**: ElasticSearch 7.10+ (optional)
- **File Storage**: AWS S3 + CloudFront

### Authentication & Security
- **JWT**: JSON Web Tokens with refresh token rotation
- **Password**: bcrypt hashing
- **2FA**: Email and SMS OTP verification
- **Firebase**: Firebase Authentication support
- **Rate Limiting**: express-rate-limit

### External Services
- **Email**: SendBay
- **SMS**: Twilio, MSG91
- **Push Notifications**: Pusher
- **Monitoring**: Sentry
- **Image Processing**: Imgix
- **Content Moderation**: Hive Moderation

### Development Tools
- **Linting**: ESLint 9.27+
- **Code Formatting**: Prettier (via ESLint)
- **Hot Reload**: Nodemon
- **Process Management**: PM2 (production)
- **CI/CD**: GitLab CI
- **Containerization**: Docker + Docker Compose

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

### Required Software
- **Node.js**: v22.16 or higher
- **npm**: v10.9.2 or higher
- **PostgreSQL**: v14 or higher
- **Redis**: v6 or higher (optional for development)

### Optional Software
- **Docker**: v20+ with Docker Compose (for containerized development)
- **ElasticSearch**: v7.10+ (for search functionality)

### Development Environment
```bash
node --version    # Should be v22.16+
npm --version     # Should be v10.9.2+
psql --version    # PostgreSQL 14+
```

## 📦 Installation

### 1. Clone the Repository

```bash
git clone https://gitlab.com/logicwind/general/backend/server-boilerplate.git
cd server-boilerplate-typescript
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Environment Configuration

Create your environment files:

```bash
# Copy the sample environment file
cp .env.sample .env

# For development
cp .env.sample .env.dev
```

### 4. Database Setup

Create PostgreSQL database and user:

```sql
-- Connect to PostgreSQL as superuser
CREATE DATABASE your_database_name;
CREATE USER your_username WITH PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE your_database_name TO your_username;
```

### 5. Run Database Migrations

```bash
npm run db:migrate
```

### 6. Start Development Server

```bash
npm run dev
```

The server will start at `http://localhost:3000` (or your configured PORT).

## ⚙️ Configuration

### Environment Variables

The application uses environment variables for configuration. Create a `.env` file based on `.env.sample`:

#### Core Configuration
```env
NODE_ENV=development
HOST=localhost
PORT=3000
API_PREFIX_ROUTE=api
APP_URL=http://localhost:3000
LOG_LEVEL=debug
```

#### Database Configuration
```env
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USERNAME=your_db_user
POSTGRES_PASSWORD=your_db_password
POSTGRES_DATABASE=your_db_name
```

#### JWT Configuration
```env
JWT_SECRET=your_super_secret_jwt_key_here
JWT_LIFE_TIME=1h
JWT_REFRESH_TOKEN_LIFE_TIME=7d
JWT_RESET_TOKEN_LIFE_TIME=15m
JWT_VERIFICATION_TOKEN_LIFE_TIME=24h
```

#### Redis Configuration (Optional)
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_TLS=false
```

#### AWS Configuration (for file uploads)
```env
AWS_S3_REGION=us-east-1
AWS_ACCESS_ID=your_aws_access_key
AWS_SECRET_KEY=your_aws_secret_key
AWS_S3_PRIVATE_BUCKET_NAME=your-private-bucket
AWS_S3_PUBLIC_BUCKET_NAME=your-public-bucket
AWS_CLOUDFRONT_PRIVATE_DOMAIN=your-private-cloudfront-domain
AWS_CLOUDFRONT_PUBLIC_DOMAIN=your-public-cloudfront-domain
```

#### Email Configuration
```env
EMAIL_PROVIDER=SENDBAY
SENDBAY_HOST=api.sendbay.com
SENDBAY_API_KEY=your_sendbay_api_key
SENDBAY_SECRET_KEY=your_sendbay_secret_key
SENDBAY_FROM_EMAIL=noreply@yourdomain.com
SENDBAY_FROM_NAME=Your App Name
```

#### SMS Configuration
```env
SMS_PROVIDER=TWILIO # or MSG91
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_PHONE_NO=+1234567890

# For MSG91
MSG91_AUTH_KEY=your_msg91_auth_key
MSG91_SENDER_ID=your_sender_id
MSG91_ROUTE=4
```

#### Security Configuration
```env
RATE_LIMIT_ENABLED=true
RATE_LIMIT_BYPASS_SECRET=your_rate_limit_bypass_secret
TIMESTAMP_VALIDATION_ENABLED=true
TIMESTAMP_VALIDATION_BYPASS_SECRET=your_timestamp_bypass_secret
TIMESTAMP_VALIDATION_TIMEOUT=300000

CORS_ENABLE=true
CORS_WEB_URLS=http://localhost:3000,https://yourdomain.com

GRAPHQL_INTROSPECTION_RESTRICTION_ENABLED=true
GRAPHQL_INTROSPECTION_RESTRICTION_SECRET=your_introspection_secret
ALLOW_INTROSPECTION=false

QUERY_DEPTH_LIMIT=10
QUERY_LENGTH_LIMIT=10000
COMPLEXITY_THRESHOLD=1000
```

#### External Services
```env
# Firebase
FIREBASE_CREDENTIALS={"type":"service_account","project_id":"your-project"}

# Sentry
SENTRY_DSN=your_sentry_dsn_here

# ElasticSearch (optional)
ELASTIC_SEARCH_ENABLED=false
ELASTIC_SEARCH_NODE=http://localhost:9200
ELASTIC_SEARCH_USERNAME=
ELASTIC_SEARCH_PASSWORD=

# Content Moderation
HIVE_MODERATION_TEXT_API_KEY=your_hive_api_key
HIVE_MODERATION_ENDPOINT=https://api.thehive.ai/api/v2/task/sync
```

### Dynamic Configuration

The application supports dynamic configuration through the database. Configurations can be managed via the admin panel or GraphQL mutations.

## 🚧 Development

### Available Scripts

```bash
# Development
npm run dev                 # Start development server with hot reload
npm run build              # Build for production
npm run start              # Start production server

# Database
npm run db:migrate         # Run database migrations

# Code Quality
npm run lint               # Run ESLint
npm run lint:fix           # Fix ESLint issues
npm run lint:watch         # Watch for linting issues

# Docker Development
npm run dev-docker:up      # Start development with Docker
npm run dev-docker:down    # Stop Docker development
npm run dev-docker:logs    # View Docker logs
```

### Development Workflow

1. **Start Development Server**
   ```bash
   npm run dev
   ```

2. **Access GraphQL Playground**
   - URL: `http://localhost:3000/api/graphql`
   - Interactive GraphQL interface for testing queries and mutations

3. **Access Queue Management**
   - URL: `http://localhost:3000/jobs/queues`
   - Bull Board interface for monitoring background jobs

4. **REST API Endpoints**
   - Base URL: `http://localhost:3000/api/v1/`
   - Version endpoint: `http://localhost:3000/api/version`

### Docker Development

For containerized development:

```bash
# Start all services (PostgreSQL, Redis, App)
npm run dev-docker:up

# View logs
npm run dev-docker:logs

# Stop services
npm run dev-docker:down
```

## 🚀 Production Deployment

### Build for Production

```bash
# Install production dependencies
npm ci --production

# Build the application
npm run build

# Run database migrations
npm run db:migrate

# Start production server
npm start
```

### Environment Setup

1. **Production Environment File**
   ```bash
   cp .env.sample .env.production
   # Configure production values
   ```

2. **Database Migration**
   ```bash
   NODE_ENV=production npm run db:migrate
   ```

3. **Process Management (PM2)**
   ```bash
   # Install PM2 globally
   npm install -g pm2

   # Start application with PM2
   pm2 start ecosystem.config.js

   # Monitor processes
   pm2 monit

   # View logs
   pm2 logs
   ```

### Docker Production

```bash
# Build production image
docker build -t server-boilerplate:latest .

# Run production container
docker run -d \
  --name server-boilerplate \
  -p 3000:3000 \
  --env-file .env.production \
  server-boilerplate:latest
```

## 📁 Project Structure

### High-Level Structure
```
src/
├── boot/           # Application initialization
├── config/         # Configuration management
├── modules/        # Business logic modules
├── shared-lib/     # Shared libraries
├── schema/         # Database models & migrations
├── rest/           # REST API implementation
├── utils/          # Application utilities
└── index.ts        # Application entry point
```

### Key Modules
- **User Module**: Complete user management with authentication
- **Event Module**: Event creation, management, and invitations
- **Config Module**: Dynamic application configuration
- **Role Module**: Role-based access control
- **Notification Module**: Multi-channel notification system

For detailed structure information, see [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md).

## 📖 API Documentation

### GraphQL API

The GraphQL API provides a single endpoint with comprehensive type safety:

- **Endpoint**: `/api/graphql`
- **Playground**: Available in development mode
- **Schema**: Self-documenting with built-in introspection

#### Key GraphQL Features
- **Queries**: Retrieve data with precise field selection
- **Mutations**: Modify data with strong validation
- **Subscriptions**: Real-time updates (if enabled)
- **Custom Directives**: Authentication, authorization, rate limiting
- **Custom Scalars**: DateTime, JSON, Limit types

### REST API

RESTful endpoints for traditional HTTP operations:

- **Base URL**: `/api/v1/`
- **Versioning**: URL-based versioning
- **Authentication**: JWT Bearer tokens
- **Content Type**: JSON

#### Main Endpoints
```
GET    /api/version              # API version info
POST   /api/v1/users/list        # Get users
GET    /api/v1/users/:id         # Get user by ID
POST   /api/v1/users/create      # Create user
PUT    /api/v1/users/:id         # Update user
DELETE /api/v1/users/:id         # Delete user
```

### Postman Collection

Import the provided `POSTMAN_COLLECTION.json` for complete API testing:

1. Open Postman
2. Click "Import"
3. Select the `POSTMAN_COLLECTION.json` file
4. Configure environment variables

For complete API documentation, see [API_DOCS.md](API_DOCS.md).

## 🔐 Authentication & Authorization

### Authentication Methods

1. **Email/Password Authentication**
   ```graphql
   mutation LoginUser($data: LoginUserInput!) {
     loginUser(data: $data) {
       accessToken
       refreshToken
       data { id email firstName lastName }
     }
   }
   ```

2. **Firebase Authentication**
   ```graphql
   mutation FirebaseLogin($data: FirebaseLoginDataInput!) {
     firebaseLogin(data: $data) {
       accessToken
       refreshToken
       data { id email }
     }
   }
   ```

### Token Management

- **Access Token**: Short-lived (default: 1 hour)
- **Refresh Token**: Long-lived (default: 7 days)
- **Token Rotation**: Automatic refresh token rotation for security

### Authorization System

#### GraphQL Directives
```graphql
# Require authentication
@isAuthenticated

# Require specific roles
@hasRole(roles: ["ADMIN", "USER"])

# Require specific permissions
@hasPermission(permissions: [{"resource": "user", "action": "read"}])

# Rate limiting
@rateLimit(max: 10, window: "1m")
```

#### Role-Based Access Control
- **Roles**: USER, ADMIN (extensible)
- **Permissions**: Fine-grained resource-action permissions
- **Dynamic Assignment**: Runtime role and permission management

### Security Features

1. **Password Security**
   - bcrypt hashing with configurable rounds
   - Password strength validation
   - Password reset with secure tokens

2. **Two-Factor Authentication**
   - Email OTP verification
   - SMS OTP verification
   - Configurable OTP expiration and retry limits

3. **Account Security**
   - Account lockout after failed attempts
   - Suspicious activity monitoring
   - Secure account deletion with OTP verification

## 🗄️ Database Management

### Database Schema

The application uses PostgreSQL with Sequelize ORM:

```
Tables:
├── users                 # User accounts
├── admin_users          # Administrator accounts
├── events               # Event management
├── event_invitees       # Event invitations
├── event_join_requests  # Event join requests
├── notifications        # System notifications
├── configs              # Application configurations
├── roles                # User roles
├── role_permissions     # Role-permission mapping
├── user_preferences     # User settings
└── ui_labels           # Internationalization labels
```

### Migration Management

```bash
# Create new migration
npx sequelize-cli migration:generate --name add-new-field

# Run migrations
npm run db:migrate

# Check migration status
npx sequelize-cli db:migrate:status
```

### Model Relationships

- **Users ↔ Events**: One-to-many (user creates events)
- **Events ↔ Invitees**: One-to-many (event has multiple invitees)
- **Users ↔ Notifications**: One-to-many (user receives notifications)
- **AdminUsers ↔ Configs**: One-to-many (admin manages configs)

For complete database documentation, see [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md).

## 🧪 Testing

### Test Structure
```
tests/
├── unit/           # Unit tests for individual functions
├── integration/    # Integration tests for modules
├── e2e/           # End-to-end API tests
└── fixtures/      # Test data and mocks
```

### Running Tests

```bash
# Run all tests
npm test

# Run unit tests
npm run test:unit

# Run integration tests
npm run test:integration

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Examples

```typescript
// Unit test example
describe('UserService', () => {
  let userService: UserService;
  
  beforeEach(() => {
    userService = new UserService();
  });

  it('should create user successfully', async () => {
    const userData = { email: 'test@example.com' };
    const result = await userService.createUser(userData);
    
    expect(result).toBeDefined();
    expect(result.email).toBe(userData.email);
  });
});

// GraphQL integration test
describe('User Mutations', () => {
  it('should login user with valid credentials', async () => {
    const mutation = `
      mutation LoginUser($data: LoginUserInput!) {
        loginUser(data: $data) {
          accessToken
          data { id email }
        }
      }
    `;
    
    const variables = {
      data: { email: 'user@example.com', password: 'password123' }
    };
    
    const response = await request(app)
      .post('/api/graphql')
      .send({ query: mutation, variables });
      
    expect(response.status).toBe(200);
    expect(response.body.data.loginUser.accessToken).toBeDefined();
  });
});
```

## 📊 Monitoring & Logging

### Logging

The application uses Winston for comprehensive logging:

```typescript
// Logger configuration
import Logger from './shared-lib/logger';

const logger = new Logger('ModuleName');

logger.info('Information message');
logger.warn('Warning message');
logger.error('Error message', { error: errorObject });
logger.debug('Debug information');
```

### Log Levels
- **error**: Error conditions
- **warn**: Warning conditions
- **info**: Informational messages
- **debug**: Debug-level messages

### Error Monitoring

#### Sentry Integration
- Automatic error capture and reporting
- Performance monitoring
- Release tracking
- User feedback collection

```typescript
// Manual error reporting
import * as Sentry from '@sentry/node';

try {
  // Code that might throw
} catch (error) {
  Sentry.captureException(error);
  throw error;
}
```

### Performance Monitoring

1. **Application Metrics**
   - Response time monitoring
   - Database query performance
   - Memory usage tracking
   - CPU utilization

2. **Database Monitoring**
   - Query execution time
   - Connection pool status
   - Slow query identification

3. **External Service Monitoring**
   - API response times
   - Service availability
   - Error rates

## ⚡ Performance Optimization

### Database Optimization

1. **Indexing Strategy**
   ```sql
   -- Frequently queried fields
   CREATE INDEX idx_users_email ON users(email);
   CREATE INDEX idx_events_user_id ON events(user_id);
   CREATE INDEX idx_notifications_receiver_id ON notifications(receiver_id);
   ```

2. **Query Optimization**
   - Use of eager loading to prevent N+1 queries
   - Pagination for large result sets
   - Proper use of database indexes

3. **Connection Pooling**
   ```typescript
   // Sequelize connection pool configuration
   const sequelize = new Sequelize({
     pool: {
       max: 20,        // Maximum connections
       min: 5,         // Minimum connections
       idle: 30000,    // Idle timeout
       acquire: 60000  // Acquire timeout
     }
   });
   ```

### Caching Strategy

1. **Redis Caching**
   - User session caching
   - Frequently accessed data
   - Query result caching

2. **Application-Level Caching**
   ```typescript
   // Cache implementation example
   class CacheService {
     async get<T>(key: string): Promise<T | null> {
       return await redis.get(key);
     }
     
     async set(key: string, value: any, ttl: number): Promise<void> {
       await redis.setex(key, ttl, JSON.stringify(value));
     }
   }
   ```

### API Optimization

1. **GraphQL Optimization**
   - Query complexity analysis
   - Depth limiting
   - DataLoader for batch operations

2. **REST API Optimization**
   - Response compression
   - Proper HTTP caching headers
   - Pagination for list endpoints

3. **Rate Limiting**
   ```typescript
   // Rate limiting configuration
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // Limit each IP to 100 requests per windowMs
     message: 'Too many requests from this IP'
   });
   ```

## 🛡️ Security

### Security Headers

```typescript
// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
}));
```

### Input Validation

1. **GraphQL Validation**
   ```graphql
   input CreateUserInput {
     email: String! @constraint(format: "email")
     password: String! @constraint(pattern: "^.{8,}$")
     firstName: String @constraint(maxLength: 50)
   }
   ```

2. **REST API Validation**
   ```typescript
   // Express validator middleware
   const createUserValidation = [
     body('email').isEmail().normalizeEmail(),
     body('password').isLength({ min: 8 }),
     body('firstName').optional().isLength({ max: 50 })
   ];
   ```

### Data Protection

1. **Encryption at Rest**
   - Database encryption (PostgreSQL TDE)
   - Encrypted environment variables
   - Secure file storage (AWS S3 encryption)

2. **Encryption in Transit**
   - HTTPS enforcement
   - TLS for database connections
   - Secure API communication

3. **Data Sanitization**
   ```typescript
   // Input sanitization
   const sanitizeInput = (input: string): string => {
     return DOMPurify.sanitize(input);
   };
   ```

### Authentication Security

1. **JWT Security**
   - Short-lived access tokens
   - Refresh token rotation
   - Token blacklisting
   - Secure token storage recommendations

2. **Password Security**
   - bcrypt with adaptive hashing
   - Password complexity requirements
   - Password history tracking
   - Secure password reset flow

3. **Multi-Factor Authentication**
   - Time-based OTP (TOTP)
   - SMS-based OTP
   - Email-based OTP
   - Backup codes

## 👥 Contributing

### Development Setup

1. **Fork the Repository**
   ```bash
   git clone https://github.com/yourusername/server-boilerplate-typescript.git
   cd server-boilerplate-typescript
   ```

2. **Create Feature Branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make Changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed

4. **Run Tests**
   ```bash
   npm run lint
   npm run test
   ```

5. **Submit Pull Request**
   - Write clear commit messages
   - Reference relevant issues
   - Include screenshots for UI changes

### Code Standards

1. **TypeScript Guidelines**
   - Use strict type checking
   - Prefer interfaces over types for object shapes
   - Use enums for constants
   - Document complex types with JSDoc

2. **Naming Conventions**
   - Files: kebab-case (`user-service.ts`)
   - Classes: PascalCase (`UserService`)
   - Variables/Functions: camelCase (`getUserById`)
   - Constants: UPPER_SNAKE_CASE (`MAX_RETRY_ATTEMPTS`)

3. **Code Organization**
   - Group related functionality
   - Keep functions focused and small
   - Use descriptive variable names
   - Add comments for complex logic

### Git Workflow

1. **Commit Messages**
   ```
   feat: add user profile management
   fix: resolve authentication token expiry issue
   docs: update API documentation
   refactor: optimize database queries
   test: add integration tests for events module
   ```

2. **Branch Naming**
   - `feature/feature-name` for new features
   - `bugfix/bug-description` for bug fixes
   - `hotfix/critical-issue` for production hotfixes
   - `docs/documentation-update` for documentation

## 📄 License

This project is licensed under the ISC License. See the [LICENSE](LICENSE) file for details.

## 🤝 Support

### Documentation

- **API Documentation**: [API_DOCS.md](API_DOCS.md)
- **Database Schema**: [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- **Code Structure**: [CODE_STRUCTURE.md](CODE_STRUCTURE.md)
- **Folder Structure**: [FOLDER_STRUCTURE.md](FOLDER_STRUCTURE.md)
- **Postman Collection**: [POSTMAN_COLLECTION.json](POSTMAN_COLLECTION.json)

### Getting Help

1. **Issues**: Report bugs and feature requests via GitLab Issues
2. **Discussions**: Join community discussions
3. **Documentation**: Check comprehensive documentation files
4. **Stack Overflow**: Tag questions with `server-boilerplate-typescript`

### Quick Links

- **GraphQL Playground**: `http://localhost:3000/api/graphql`
- **Queue Management**: `http://localhost:3000/jobs/queues`
- **API Version**: `http://localhost:3000/api/version`
- **Health Check**: `http://localhost:3000/api/v1/auth/health`

---

## 🚀 Quick Start Checklist

- [ ] Install Node.js 22.16+
- [ ] Install PostgreSQL 14+
- [ ] Clone repository
- [ ] Run `npm install`
- [ ] Copy `.env.sample` to `.env`
- [ ] Configure database connection
- [ ] Run `npm run db:migrate`
- [ ] Start development: `npm run dev`
- [ ] Visit GraphQL Playground: `http://localhost:3000/api/graphql`
- [ ] Test API with Postman collection

**Happy coding! 🎉**