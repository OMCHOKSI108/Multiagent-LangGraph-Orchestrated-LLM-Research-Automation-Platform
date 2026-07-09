# TypeScript Server Boilerplate - Module Flow Architecture

## Overview

This document provides a comprehensive overview of the module-wise flow architecture for the TypeScript Server Boilerplate project. The system is built using a layered architecture with clear separation of concerns, making it scalable, maintainable, and secure.

## Architecture Layers

### 1. **Entry Point & Application Setup**

**Files**: `src/index.ts`, `src/start-apollo-server.ts`

The application starts with the main entry point that:
- Initializes Express application
- Sets up compression, CORS, and body parsing
- Configures middleware chain
- Starts Apollo GraphQL server
- Initializes database connections
- Sets up queue processing
- Configures error handling

### 2. **Middleware Layer**

**Location**: `src/rest/middlewares/`

The middleware chain processes every request through:

- **Timestamp Validation** (`validate-time-stamp.ts`)
  - Validates request timestamp to prevent replay attacks
  - Configurable timeout window
  - Bypass mechanism for development

- **Locale Service Setup** (`set-locale-service-in-req.ts`)
  - Initializes internationalization support
  - Sets up locale context for request
  - Provides translation services

- **Request Logging** (`set-log-info-in-req.ts`)
  - Captures request metadata (IP, User-Agent, Request ID)
  - Sets up request tracking for debugging
  - Integrates with Winston logger

- **Query Length Validation** (`query-length-middleware.ts`)
  - Prevents large query attacks
  - Configurable query length limits
  - Returns appropriate error responses

- **Introspection Restriction** (`introspection-restriction-middleware.ts`)
  - Controls GraphQL introspection access
  - Production security measure
  - Secret-based bypass for development

### 3. **Routing Layer**

#### GraphQL Route (Apollo Server)
**File**: `src/start-apollo-server.ts`

- **Schema Management**: Automatic merging of type definitions and resolvers
- **Directive Application**: Security and authorization directives
- **Context Creation**: Request context with user info, locale service, and database models
- **Error Formatting**: Standardized error responses with localization
- **Plugin System**: Query complexity, rate limiting, and validation plugins

#### REST Route
**Location**: `src/rest/routes/`

- **Version Management**: Structured API versioning (v1, v2, etc.)
- **Express Routing**: Traditional REST endpoint handling
- **Middleware Integration**: Authentication, validation, and error handling
- **Controller Pattern**: Separation of route handling and business logic

### 4. **Directive Layer (GraphQL Security)**

**Location**: `src/directives/`

Security directives that wrap GraphQL resolvers:

- **@isAuthenticated** (`auth-directive.ts`)
  - JWT token validation
  - User authentication verification
  - Request context enrichment with user data

- **@hasRole** (`has-role-directive.ts`)
  - Role-based access control
  - Hierarchical role checking
  - Integration with user role system

- **@hasPermission** (`has-permission.ts`)
  - Fine-grained permission checking
  - Resource-specific access control
  - Permission inheritance support

- **@rateLimit** (`rate-limit-directive.ts`)
  - Request throttling per user/IP
  - Configurable rate limits
  - Redis-based rate limiting storage

### 5. **Module Layer**

The core business logic is organized into feature modules:

#### **User Module** (`src/modules/user/`)

**Structure**:
```
user/
├── resolvers/
│   ├── mutations/      # User operations (signup, login, update)
│   ├── queries/        # User data retrieval
│   └── user.common.resolvers.ts
├── services/           # Business logic layer
├── field-resolvers/    # GraphQL field resolvers
└── function/          # Helper utilities
```

**Key Features**:
- Authentication & Authorization
- Profile Management
- Password Management
- Email/Mobile Verification
- User Preferences
- Import/Export functionality
- Admin user management

#### **Config Module** (`src/modules/config/`)

**Responsibilities**:
- System configuration management
- Feature flags
- Public and private configurations
- Dynamic configuration updates
- Environment-specific settings

#### **Role Module** (`src/modules/role/`)

**Responsibilities**:
- Role definition and management
- Permission assignment
- Role hierarchy management
- Access control matrix

#### **Event Module** (`src/modules/event/`)

**Responsibilities**:
- Event creation and management
- Invitee management
- Event join requests
- Event scheduling and notifications

#### **Notification Module** (`src/modules/notification/`)

**Responsibilities**:
- Push notification delivery
- Email notification management
- Real-time notification system
- Notification preferences

#### **UI Label Module** (`src/modules/ui-label/`)

**Responsibilities**:
- Internationalization labels
- Multi-language support
- Dynamic UI text management
- Translation file generation

### 6. **Shared Library Layer**

**Location**: `src/shared-lib/`

Cross-cutting concerns and utilities:

#### **Authentication Utils** (`src/utils/auth/`)
- JWT token generation and validation
- Password hashing and comparison
- Access token management
- Refresh token handling

#### **Error Handler** (`src/shared-lib/error-handler/`)
- Custom GraphQL error types
- Error localization
- Sentry integration
- Error logging and tracking

#### **Email Service** (`src/shared-lib/email/`)
- SMTP integration (Sendbay)
- Email template management
- Bulk email sending
- Email verification workflows

#### **SMS Service** (`src/shared-lib/providers/sms/`)
- Multiple SMS providers (Twilio, MSG91)
- OTP delivery
- Bulk SMS functionality
- SMS template management

#### **AWS Services** (`src/shared-lib/aws/`)
- S3 file storage
- CloudFront CDN integration
- Signed URL generation
- File upload/download management

#### **Firebase Service** (`src/shared-lib/firebase/`)
- Firebase Authentication
- Admin SDK integration
- Push notification delivery
- User management

#### **Elasticsearch** (`src/shared-lib/elastic-search/`)
- Search index management
- Query optimization
- Data analytics
- Full-text search capabilities

#### **Queue System** (`src/shared-lib/queue/`)
- BullMQ job queue
- Background task processing
- Email queue processing
- Import/Export job handling

#### **Logger** (`src/shared-lib/logger/`)
- Winston-based logging
- Request/response logging
- Error tracking
- Performance metrics

#### **Pusher Service** (`src/shared-lib/pusher/`)
- Real-time WebSocket connections
- Live notifications
- Event broadcasting
- Presence channels

### 7. **Data Layer**

#### **Sequelize ORM** (`src/sequelize-client.ts`)
- Database model definitions
- Relationship management
- Migration support
- Query optimization

#### **Database Models** (`src/schema/main-server/models/`)
Key models include:
- **User**: User account management
- **AdminUser**: Administrative user accounts
- **Role & RolePermission**: Access control system
- **Event & EventInvitee**: Event management
- **Config**: System configuration
- **UiLabel**: Internationalization
- **Notification**: Notification system
- **ImportExportJob**: Background job tracking

#### **Database** (PostgreSQL)
- Primary data storage
- ACID compliance
- Complex relationship support
- Performance optimization

#### **Cache Layer** (Redis)
- Session storage
- Rate limiting data
- Queue job storage
- Temporary data caching

### 8. **External Service Integration**

#### **AWS Integration**
- **S3**: File storage and management
- **CloudFront**: CDN for file delivery
- **Signed URLs**: Secure file access

#### **Communication Services**
- **Twilio**: SMS delivery service
- **MSG91**: Alternative SMS provider
- **Sendbay**: Email delivery service

#### **Authentication & Monitoring**
- **Firebase**: Authentication provider
- **Sentry**: Error tracking and monitoring
- **Pusher**: Real-time communication

#### **Search & Moderation**
- **Elasticsearch**: Search and analytics
- **Hive Moderation**: Content moderation

## Request Flow Patterns

### 1. **GraphQL Request Flow**

```
Client Request → Express App → Middleware Chain → Apollo Server
    ↓
GraphQL Directives (@isAuthenticated, @hasRole, @hasPermission, @rateLimit)
    ↓
Module Resolvers → Services → Shared Libraries → Database/External Services
    ↓
Response Formatting → Client
```

### 2. **REST Request Flow**

```
Client Request → Express App → Middleware Chain → REST Routes
    ↓
Controller → Service → Shared Libraries → Database/External Services
    ↓
Response → Client
```

### 3. **Authentication Flow**

```
Login Request → User Module → Authentication Service
    ↓
Password Validation → JWT Generation → Token Storage (Redis)
    ↓
Access Token + Refresh Token → Client
```

### 4. **Authorization Flow**

```
Protected Request → @isAuthenticated Directive
    ↓
JWT Validation → User Context Creation
    ↓
@hasRole/@hasPermission Directives → Access Control Check
    ↓
Allow/Deny Request
```

### 5. **Background Job Flow**

```
Service Trigger → Queue System (BullMQ) → Redis Storage
    ↓
Worker Process → Job Execution → External Service Integration
    ↓
Job Completion → Result Storage/Notification
```

### 6. **Email/SMS Notification Flow**

```
Trigger Event → Notification Service → Queue System
    ↓
Background Worker → Email/SMS Service → External Provider
    ↓
Delivery Confirmation → Status Update
```

## Key Features & Benefits

### **Security Features**
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Permission-based authorization
- Rate limiting and request throttling
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- Timestamp-based replay attack prevention

### **Scalability Features**
- Modular architecture for easy feature addition
- Background job processing
- Caching layer with Redis
- CDN integration for file delivery
- Database optimization with Sequelize ORM
- Queue-based processing for heavy operations

### **Developer Experience**
- TypeScript for type safety
- Comprehensive error handling and logging
- Auto-generated API documentation
- Docker support for containerization
- Database migrations for schema management
- Comprehensive testing framework
- Lint and code formatting tools

### **Monitoring & Observability**
- Sentry integration for error tracking
- Winston logging with structured logs
- Request/response tracking
- Performance monitoring
- Queue job monitoring with Bull Board
- Database query logging

### **Integration Capabilities**
- Multiple SMS providers (Twilio, MSG91)
- Email service integration (Sendbay)
- File storage with AWS S3
- CDN with AWS CloudFront
- Real-time features with Pusher
- Search capabilities with Elasticsearch
- Content moderation with Hive
- Authentication with Firebase

## Usage Instructions

### **Accessing the Flow Diagram**

1. **View Online**: Open `FLOW_DIAGRAM.drawio` in [draw.io](https://app.diagrams.net/)
2. **Edit**: Use draw.io desktop app or online editor
3. **Export**: Generate PNG, SVG, PDF, or other formats as needed

### **Understanding the Flow**

1. **Follow the Color-Coded Lines**:
   - **Blue (Thick)**: Main request flow
   - **Green (Thick)**: Routing decisions
   - **Purple**: Directive processing
   - **Orange**: Module interactions
   - **Pink**: Service layer calls
   - **Brown (Dashed)**: Shared library usage
   - **Red (Thick)**: Database operations
   - **Green (Dashed)**: Cache operations
   - **Yellow (Dashed)**: External service calls

2. **Layer Understanding**:
   - Start from the top (Client Request)
   - Follow the flow through each layer
   - Understand the responsibilities at each level
   - Note the integration points

### **Extending the Architecture**

1. **Adding New Modules**:
   - Create resolver, service, and model files
   - Update the module index for auto-loading
   - Add appropriate security directives
   - Document the new flow patterns

2. **Adding External Services**:
   - Create service wrapper in shared-lib
   - Add configuration in config.ts
   - Update environment variables
   - Add error handling and logging

3. **Modifying Security**:
   - Update directive logic
   - Modify middleware chain
   - Adjust role/permission definitions
   - Test authorization flows

## Maintenance Guidelines

- **Regular Updates**: Keep dependencies updated
- **Security Audits**: Regular security reviews
- **Performance Monitoring**: Track key metrics
- **Documentation**: Keep architecture docs updated
- **Testing**: Maintain comprehensive test coverage
- **Logging**: Monitor logs for issues and optimization opportunities

This architecture provides a solid foundation for building scalable, secure, and maintainable TypeScript applications with GraphQL and REST API support.