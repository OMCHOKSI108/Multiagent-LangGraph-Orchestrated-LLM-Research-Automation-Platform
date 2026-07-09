# Server Boilerplate TypeScript - Complete Codebase Documentation

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Setup & Installation](#setup--installation)
6. [Configuration](#configuration)
7. [Database Schema](#database-schema)
8. [API Documentation](#api-documentation)
9. [Modules](#modules)
10. [Authentication & Authorization](#authentication--authorization)
11. [Caching](#caching)
12. [Error Handling](#error-handling)
13. [Logging](#logging)
14. [Testing](#testing)
15. [Deployment](#deployment)
16. [Development Guidelines](#development-guidelines)

---

## Project Overview

This is a comprehensive Node.js/TypeScript backend boilerplate built with GraphQL and REST APIs. It provides a robust foundation for building scalable web applications with features like authentication, authorization, caching, internationalization, and more.

### Key Features
- **GraphQL & REST APIs**: Dual API support with Apollo Server
- **Authentication**: JWT-based authentication with Firebase support
- **Authorization**: Role-based access control (RBAC)
- **Caching**: Redis-based caching system
- **Internationalization**: Multi-language support
- **Database**: PostgreSQL with Sequelize ORM
- **File Storage**: AWS S3 integration
- **Queue System**: BullMQ for background jobs
- **Monitoring**: Sentry integration for error tracking
- **Rate Limiting**: Built-in rate limiting for APIs
- **Validation**: GraphQL constraint validation

---

## Architecture

### High-Level Architecture
```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Client Apps   │    │   GraphQL API   │    │   REST API      │
│                 │◄──►│   (Apollo)      │    │   (Express)     │
└─────────────────┘    └─────────────────┘    └─────────────────┘
                                │                       │
                                ▼                       ▼
                       ┌─────────────────────────────────────┐
                       │         Application Layer           │
                       │  ┌─────────────┐  ┌─────────────┐   │
                       │  │  Resolvers  │  │ Controllers │   │
                       │  └─────────────┘  └─────────────┘   │
                       └─────────────────────────────────────┘
                                │
                                ▼
                       ┌─────────────────────────────────────┐
                       │         Service Layer               │
                       │  ┌─────────────┐  ┌─────────────┐   │
                       │  │  Services   │  │  Utilities  │   │
                       │  └─────────────┘  └─────────────┘   │
                       └─────────────────────────────────────┘
                                │
                                ▼
                       ┌─────────────────────────────────────┐
                       │         Data Layer                  │
                       │  ┌─────────────┐  ┌─────────────┐   │
                       │  │  Models     │  │  Migrations │   │
                       │  └─────────────┘  └─────────────┘   │
                       └─────────────────────────────────────┘
                                │
                                ▼
                       ┌─────────────────────────────────────┐
                       │         Infrastructure              │
                       │  ┌─────────────┐  ┌─────────────┐   │
                       │  │ PostgreSQL  │  │    Redis    │   │
                       │  └─────────────┘  └─────────────┘   │
                       └─────────────────────────────────────┘
```

### Module Architecture
The application follows a modular architecture where each module contains:
- **GraphQL Schema** (`.graphql` files)
- **Resolvers** (Query/Mutation handlers)
- **Services** (Business logic)
- **Types** (TypeScript interfaces)
- **Models** (Database models)

---

## Technology Stack

### Core Technologies
- **Runtime**: Node.js 22.16
- **Language**: TypeScript 5.8.3
- **Framework**: Express.js 4.21.2
- **GraphQL**: Apollo Server 4.12.1
- **Database**: PostgreSQL with Sequelize ORM
- **Cache**: Redis (ioredis)
- **Authentication**: JWT, Firebase Admin
- **File Storage**: AWS S3
- **Queue**: BullMQ
- **Monitoring**: Sentry
- **Logging**: Winston

### Development Tools
- **Linting**: ESLint with TypeScript support
- **Code Formatting**: Prettier
- **Git Hooks**: Husky
- **Containerization**: Docker
- **CI/CD**: GitLab CI

---

## Project Structure

```
server-boilerplate-typescript/
├── src/
│   ├── boot/                    # Application bootstrapping
│   │   ├── data/               # Seed data
│   │   ├── create-admin-users.ts
│   │   ├── create-configs.ts
│   │   ├── create-role-data.ts
│   │   └── index.ts
│   ├── config/                 # Configuration management
│   │   └── config.ts
│   ├── constants/              # Application constants
│   │   ├── api-constants.ts
│   │   ├── error-type.ts
│   │   ├── language-constants.ts
│   │   └── service-constants.ts
│   ├── directives/             # GraphQL directives
│   │   ├── auth-directive.ts
│   │   ├── has-permission.ts
│   │   ├── has-role-directive.ts
│   │   ├── rate-limit-directive.ts
│   │   └── index.ts
│   ├── enums/                  # TypeScript enums
│   │   ├── api.ts
│   │   ├── error-type.ts
│   │   ├── language.ts
│   │   └── service.ts
│   ├── functions/              # Utility functions
│   │   └── common.ts
│   ├── lib/                    # Library files
│   ├── logger/                 # Logging configuration
│   │   └── logger.ts
│   ├── modules/                # Feature modules
│   │   ├── common/             # Common functionality
│   │   ├── config/             # Configuration management
│   │   ├── role/               # Role management
│   │   └── user/               # User management
│   ├── providers/              # External service providers
│   │   ├── auth.ts
│   │   ├── email.ts
│   │   └── index.ts
│   ├── pubsub/                 # PubSub functionality
│   │   └── index.ts
│   ├── rest/                   # REST API endpoints
│   │   ├── middlewares/
│   │   ├── modules/
│   │   └── routes/
│   ├── scalars/                # GraphQL custom scalars
│   │   └── limit-scalar.ts
│   ├── schema/                 # Database schema
│   │   └── main-server/
│   │       ├── enums/
│   │       ├── migrations/
│   │       └── models/
│   ├── shared-lib/             # Shared libraries
│   │   ├── aws/                # AWS services
│   │   ├── email/              # Email templates
│   │   ├── error-handler/      # Error handling
│   │   ├── firebase/           # Firebase integration
│   │   ├── graphql/            # GraphQL utilities
│   │   ├── hive-moderation/    # Content moderation
│   │   ├── imgix/              # Image processing
│   │   ├── logger/             # Logging utilities
│   │   ├── providers/          # Service providers
│   │   ├── pusher/             # Real-time notifications
│   │   ├── queue/              # Queue management
│   │   ├── queue-processor/    # Queue processors
│   │   ├── types/              # Shared types
│   │   └── utils/              # Utility functions
│   ├── types/                  # Global TypeScript types
│   │   ├── common.d.ts
│   │   └── constant.d.ts
│   ├── utils/                  # Utility functions
│   │   ├── auth/               # Authentication utilities
│   │   ├── intl/               # Internationalization
│   │   └── rest/               # REST utilities
│   ├── index.ts                # Application entry point
│   ├── redis-client.ts         # Redis client
│   ├── sequelize-client.ts     # Database client
│   └── start-apollo-server.ts  # Apollo Server setup
├── docker/                     # Docker configuration
├── build/                      # Compiled JavaScript
├── package.json
├── tsconfig.json
├── eslint.config.mjs
├── Dockerfile
├── docker-compose.dev.yml
└── README.md
```

---

## Setup & Installation

### Prerequisites
- Node.js 22.16+
- npm 10.9.2+
- PostgreSQL
- Redis
- Docker (optional)

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone --recursive [repository-url]
   cd server-boilerplate-typescript
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Environment Configuration**
   ```bash
   cp .env.sample .env
   # Edit .env with your configuration
   ```

4. **Database Setup**
   - Create PostgreSQL database
   - Update database connection in `.env`
   - Run migrations: `npm run db:migrate`

5. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

### Docker Setup

1. **Configure Docker environment**
   ```bash
   # Modify docker/.env.docker
   # Update startup.sh if needed
   ```

2. **Start with Docker**
   ```bash
   npm run dev-docker:up
   ```

3. **View logs**
   ```bash
   npm run dev-docker:logs
   ```

4. **Stop containers**
   ```bash
   npm run dev-docker:down
   ```

---

## Configuration

### Environment Variables

Key configuration variables in `.env`:

```env
# Server Configuration
NODE_ENV=development
HOST=localhost
PORT=3000
API_PREFIX_ROUTE=api

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=your_db_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your_redis_password
REDIS_TLS=false

# JWT
JWT_SECRET=your_jwt_secret
JWT_LIFE_TIME=7d
JWT_RESET_TOKEN_LIFE_TIME=1
JWT_VERIFICATION_TOKEN_LIFE_TIME=1d

# AWS
AWS_S3_REGION=us-east-1
AWS_ACCESS_ID=your_access_id
AWS_SECRET_KEY=your_secret_key
AWS_S3_PRIVATE_BUCKET_NAME=your_private_bucket
AWS_S3_PUBLIC_BUCKET_NAME=your_public_bucket

# Firebase
FIREBASE_PROJECT_ID=your_project_id
FIREBASE_PRIVATE_KEY=your_private_key
FIREBASE_CLIENT_EMAIL=your_client_email

# Sentry
SENTRY_DSN=your_sentry_dsn

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_BYPASS_SECRET=your_bypass_secret

# GraphQL
COMPLEXITY_THRESHOLD=60
QUERY_DEPTH_LIMIT=5
QUERY_LENGTH_LIMIT=3500
QUERY_PAGING_MIN_COUNT=10
QUERY_PAGING_MAX_COUNT=50
```

---

## Database Schema

### Core Models

#### User Model
```typescript
interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  isActive: boolean;
  authService: AuthServiceEnum;
  authServiceId: string;
  verifiedOn?: Date;
  createdAt: Date;
  updatedAt: Date;
}
```

#### AdminUser Model
```typescript
interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImage?: string;
  isActive: boolean;
  roles: string[];
  createdAt: Date;
  updatedAt: Date;
}
```

#### Config Model
```typescript
interface Config {
  id: string;
  key: string;
  value: string;
  dataType: ConfigDataType;
  type: ConfigType;
  createdBy?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

#### Role Model
```typescript
interface Role {
  id: string;
  name: string;
  description?: string;
  key: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}
```

### Database Enums

```typescript
enum ConfigType {
  PRIVATE = 'PRIVATE',
  PUBLIC = 'PUBLIC',
  PROTECTED = 'PROTECTED'
}

enum ConfigDataType {
  INTEGER = 'INTEGER',
  STRING = 'STRING',
  BOOLEAN = 'BOOLEAN'
}

enum AuthServiceEnum {
  FIREBASE = 'FIREBASE',
  EMAIL_PASSWORD = 'EMAIL_PASSWORD',
  AUTH_ZERO = 'AUTH_ZERO'
}
```

---

## API Documentation

### GraphQL API

The application provides a comprehensive GraphQL API with the following features:

#### Authentication & Authorization
- JWT-based authentication
- Role-based access control
- Permission-based authorization
- Rate limiting

#### Available Queries

##### Config Management
```graphql
# Get all configs (Admin only)
query GetConfigs($filter: ConfigFilterInput, $sort: ConfigSortInput) {
  configs(filter: $filter, sort: $sort) {
    data {
      id
      key
      value
      dataType
      type
      createdAt
    }
    count
  }
}

# Get public configs (Public)
query GetPublicConfigs($filter: PublicConfigFilterInput, $sort: ConfigSortInput) {
  publicConfigs(filter: $filter, sort: $sort) {
    data {
      id
      key
      value
      dataType
      type
      createdAt
    }
    count
  }
}

# Get single config (Admin only)
query GetConfig($where: ConfigUniqueInput!) {
  config(where: $where) {
    data {
      id
      key
      value
      dataType
      type
    }
    message
  }
}
```

##### User Management
```graphql
# User authentication
mutation LoginUser($data: LoginUserInput!) {
  loginUser(data: $data) {
    user {
      id
      email
      firstName
      lastName
    }
    accessToken
    refreshToken
  }
}

# User registration
mutation SignUp($data: SignUpInput!) {
  signUp(data: $data) {
    message
    user {
      id
      email
      firstName
      lastName
    }
  }
}

# Get user profile
query GetMe {
  me {
    id
    email
    firstName
    lastName
    profileImage
    isActive
  }
}
```

##### Role Management
```graphql
# Get all roles (Super Admin only)
query GetRoles($filter: RolesFilters, $sort: RolesSort) {
  roles(filter: $filter, sort: $sort) {
    data {
      id
      name
      description
      key
      permissions
    }
    count
  }
}
```

#### Available Mutations

##### Config Management
```graphql
# Create config (Admin only)
mutation CreateConfig($data: CreateConfigInput!) {
  createConfig(data: $data) {
    data {
      id
      key
      value
      dataType
      type
    }
    message
  }
}

# Update config (Admin only)
mutation UpdateConfig($where: ConfigUniqueInput!, $data: UpdateConfigInput!) {
  updateConfig(where: $where, data: $data) {
    data {
      id
      key
      value
      dataType
      type
    }
    message
  }
}

# Delete config (Super Admin only)
mutation DeleteConfig($where: ConfigUniqueInput!) {
  deleteConfig(where: $where) {
    message
  }
}
```

### REST API

The application also provides REST endpoints for specific functionality:

#### Authentication Endpoints
```
POST /api/v1/auth/login
POST /api/v1/auth/register
POST /api/v1/auth/logout
POST /api/v1/auth/refresh-token
```

#### File Upload Endpoints
```
POST /api/v1/upload/signed-url
GET /api/v1/upload/signed-url
```

---

## Modules

### 1. Config Module

**Purpose**: Manages application configuration settings

**Features**:
- CRUD operations for configs
- Public/Private/Protected config types
- Search and pagination
- Caching with Redis
- Role-based access control

**Key Files**:
- `src/modules/config/config.graphql` - GraphQL schema
- `src/modules/config/configTypes.d.ts` - TypeScript types
- `src/modules/config/services/` - Business logic
- `src/modules/config/resolvers/` - GraphQL resolvers

**Recent Updates**:
- Added pagination and search to publicConfigs
- Implemented Redis caching (24-hour TTL)
- Optimized database queries using `findAndCountAll`

### 2. User Module

**Purpose**: Manages user accounts and authentication

**Features**:
- User registration and authentication
- Email verification
- Password management
- Profile management
- Firebase integration
- Role assignment

**Key Files**:
- `src/modules/user/user.common.graphql` - Public user schema
- `src/modules/user/user.admin.graphql` - Admin user schema
- `src/modules/user/services/` - Business logic
- `src/modules/user/resolvers/` - GraphQL resolvers

### 3. Role Module

**Purpose**: Manages user roles and permissions

**Features**:
- Role creation and management
- Permission assignment
- Role-based access control
- Super admin functionality

**Key Files**:
- `src/modules/role/role.admin.graphql` - Admin role schema
- `src/modules/role/services/` - Business logic
- `src/modules/role/resolvers/` - GraphQL resolvers

### 4. Common Module

**Purpose**: Provides shared functionality

**Features**:
- Dynamic message system
- Common utilities
- Shared types and interfaces

---

## Authentication & Authorization

### Authentication Flow

1. **User Registration**
   ```typescript
   // User provides email/password or uses Firebase
   // System creates user account
   // Email verification sent (if required)
   ```

2. **User Login**
   ```typescript
   // User provides credentials
   // System validates credentials
   // JWT tokens generated (access + refresh)
   // Tokens returned to client
   ```

3. **Token Validation**
   ```typescript
   // Client includes token in requests
   // System validates token
   // User context added to request
   ```

### Authorization System

#### Role-Based Access Control (RBAC)

```typescript
// Available roles
enum AdminRoleEnum {
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN'
}

// GraphQL directive usage
@hasRole(roles: ["SUPER_ADMIN", "ADMIN"])
```

#### Permission-Based Authorization

```typescript
// Permission levels
type PermissionLevel = 'NONE' | 'VIEW' | 'EDIT' | 'DELETE';

// GraphQL directive usage
@hasPermission(permissions: [{"key": "config", "level": "EDIT"}])
```

### GraphQL Directives

#### @hasRole
```graphql
type Query {
  configs: ConfigsResponse @hasRole(roles: ["SUPER_ADMIN", "ADMIN"])
}
```

#### @rateLimit
```graphql
type Query {
  publicConfigs: PublicConfigsResponse @rateLimit(window: "1m", max: 100)
}
```

#### @isAuthenticated
```graphql
type Query {
  me: User @isAuthenticated
}
```

---

## Caching

### Redis Caching Implementation

The application uses Redis for caching with the following features:

#### Cache Functions
```typescript
// Get cached data
const cached = await getCachedData(cacheKey);

// Set cache data
await setCacheData(cacheKey, data, expiry);

// Purge cache by pattern
await purgeCacheByKey(pattern, ctx);
```

#### Caching Strategy

**Public Configs**:
- Cache key: `publicConfigs:${filter}:${sort}`
- TTL: 24 hours (86400 seconds)
- Cache invalidation: Manual or TTL-based

**Cache Key Generation**:
```typescript
const cacheKey = `publicConfigs:${JSON.stringify(filter)}:${JSON.stringify(sort)}`;
```

#### Cache Configuration
```typescript
// Redis connection
const redisOptions: RedisOptions = {
  host: CONFIG.REDIS.HOST,
  port: CONFIG.REDIS.PORT,
  password: CONFIG.REDIS.PASSWORD,
  tls: CONFIG.REDIS.TLS ? {} : undefined
};
```

---

## Error Handling

### Error Types
```typescript
enum ErrorType {
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  BAD_REQUEST = 'BAD_REQUEST',
  NOT_FOUND = 'NOT_FOUND',
  FORBIDDEN = 'FORBIDDEN',
  CONFLICT = 'CONFLICT',
  UNAUTHORIZED = 'UNAUTHORIZED'
}
```

### Custom GraphQL Errors
```typescript
class CustomGraphqlError extends GraphQLError {
  constructor(message: string, code: string = 'CUSTOM_GRAPHQL_ERROR') {
    super(message, { extensions: { code } });
  }
}
```

### Error Response Format
```json
{
  "errors": [
    {
      "message": "Config not found!",
      "extensions": {
        "code": "NOT_FOUND",
        "type": "CUSTOM_GRAPHQL_ERROR"
      }
    }
  ]
}
```

---

## Logging

### Logging Configuration
```typescript
// Winston logger configuration
const logger = new Logger('module-name');

// Log levels
logger.info('Information message');
logger.error('Error message', error);
logger.debug('Debug message');
logger.warn('Warning message');
```

### Request Logging
```typescript
// Request metadata
interface RequestMeta {
  userId?: string;
  clientName?: string;
  reqIp?: string;
  requestId: string;
  userAgent?: UserAgent.IResult;
}
```

### Log Format
```
[timestamp] [level] [module] message {metadata}
```

---

## Testing

### Test Structure
```
tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
├── e2e/           # End-to-end tests
└── fixtures/      # Test data
```

### Running Tests
```bash
# Run all tests
npm test

# Run specific test suite
npm run test:unit
npm run test:integration
npm run test:e2e
```

---

## Deployment

### Production Build
```bash
# Build the application
npm run build

# Start production server
npm start
```

### Docker Deployment
```dockerfile
# Multi-stage build
FROM node:22.16-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:22.16-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/build ./build
COPY package*.json ./
EXPOSE 3000
CMD ["node", "build/index.js"]
```

### Environment Variables for Production
```env
NODE_ENV=production
HOST=0.0.0.0
PORT=3000
SENTRY_DSN=your_sentry_dsn
RATE_LIMIT_ENABLED=true
```

---

## Development Guidelines

### Code Style

#### TypeScript
- Use strict TypeScript configuration
- Prefer interfaces over types for object shapes
- Use enums for constants
- Implement proper error handling

#### GraphQL
- Use PascalCase for types and enums
- Use camelCase for fields and arguments
- Implement proper validation with directives
- Use fragments for reusable field selections

#### File Naming
- Use kebab-case for file names
- Use PascalCase for class names
- Use camelCase for function and variable names

### Git Workflow
```bash
# Feature branch workflow
git checkout -b feature/new-feature
# Make changes
git add .
git commit -m "feat: add new feature"
git push origin feature/new-feature
# Create merge request
```

### Commit Message Convention
```
type(scope): description

feat: new feature
fix: bug fix
docs: documentation changes
style: formatting changes
refactor: code refactoring
test: adding tests
chore: maintenance tasks
```

### Performance Guidelines

#### Database Optimization
- Use `findAndCountAll` for paginated queries
- Implement proper indexing
- Use transactions for data consistency
- Optimize N+1 queries with includes

#### Caching Strategy
- Cache frequently accessed data
- Use appropriate TTL values
- Implement cache invalidation
- Monitor cache hit rates

#### API Optimization
- Implement rate limiting
- Use pagination for large datasets
- Optimize GraphQL queries with complexity limits
- Implement proper error handling

---

## Troubleshooting

### Common Issues

#### Database Connection Issues
```bash
# Check database connection
npm run db:migrate

# Verify environment variables
echo $DB_HOST $DB_PORT $DB_NAME
```

#### Redis Connection Issues
```bash
# Check Redis connection
redis-cli ping

# Verify Redis configuration
echo $REDIS_HOST $REDIS_PORT
```

#### GraphQL Schema Issues
```bash
# Validate GraphQL schema
npm run lint

# Check for schema conflicts
npm run build
```

### Debug Mode
```bash
# Enable debug logging
LOG_LEVEL=debug npm run dev

# Enable GraphQL introspection
ALLOW_INTROSPECTION=true npm run dev
```

---

## Support & Maintenance

### Monitoring
- **Sentry**: Error tracking and performance monitoring
- **Winston**: Application logging
- **Redis**: Cache monitoring
- **PostgreSQL**: Database monitoring

### Maintenance Tasks
- Regular dependency updates
- Database migration management
- Cache cleanup
- Log rotation
- Security updates

### Performance Monitoring
- Query performance analysis
- Cache hit rate monitoring
- API response time tracking
- Memory usage monitoring

---

## Conclusion

This server boilerplate provides a robust foundation for building scalable Node.js applications with TypeScript, GraphQL, and REST APIs. It includes comprehensive features for authentication, authorization, caching, and monitoring, making it suitable for production applications.

The modular architecture allows for easy extension and maintenance, while the comprehensive testing and documentation ensure code quality and developer productivity.

For questions or contributions, please refer to the project repository and documentation. 