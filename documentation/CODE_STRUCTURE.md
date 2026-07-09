# Code Structure Documentation

## Overview

The Server Boilerplate TypeScript follows a modular, layered architecture designed for scalability, maintainability, and clear separation of concerns. The codebase is organized into distinct modules with well-defined responsibilities and clean interfaces.

## Table of Contents

1. [Project Structure](#project-structure)
2. [Core Architecture](#core-architecture)
3. [Module System](#module-system)
4. [Service Layer](#service-layer)
5. [Data Layer](#data-layer)
6. [Utility Libraries](#utility-libraries)
7. [Configuration Management](#configuration-management)
8. [Design Patterns](#design-patterns)

## Project Structure

```
src/
├── boot/                           # Application bootstrap and initialization
│   ├── data/                      # Bootstrap data for initial setup
│   └── index.ts                   # Main bootstrap orchestrator
├── config/                        # Application configuration
│   └── config.ts                  # Centralized configuration management
├── constants/                     # Application constants and enums
│   ├── api-constants.ts           # API route constants
│   ├── error-type.ts              # Error type definitions
│   ├── language-constants.ts      # Language and localization constants
│   └── service-constants.ts       # Service-level constants
├── directives/                    # GraphQL custom directives
│   ├── auth-directive.ts          # Authentication directive
│   ├── has-permission.ts          # Permission-based access control
│   ├── has-role-directive.ts      # Role-based access control
│   ├── rate-limit-directive.ts    # Rate limiting directive
│   └── index.ts                   # Directive aggregator
├── enums/                         # TypeScript enums
│   ├── api.ts                     # API-related enums
│   ├── error-type.ts              # Error classification enums
│   ├── language.ts                # Language enums
│   └── service.ts                 # Service enums
├── functions/                     # Common utility functions
│   └── common.ts                  # General-purpose utilities
├── lib/                          # External library integrations
├── logger/                       # Logging utilities
├── modules/                      # Business logic modules
│   ├── common/                   # Shared/common functionality
│   ├── config/                   # Configuration management
│   ├── event/                    # Event management
│   ├── notification/             # Notification system
│   ├── role/                     # Role management
│   ├── role-permission/          # Permission system
│   ├── ui-label/                 # UI localization
│   └── user/                     # User management
├── providers/                    # External service providers
├── pubsub/                       # Pub/Sub messaging
├── rest/                         # REST API implementation
│   ├── middlewares/              # Express middlewares
│   ├── modules/                  # REST-specific modules
│   └── routes/                   # Route definitions
├── scalars/                      # GraphQL custom scalars
├── schema/                       # Database schema and models
│   ├── elastic-search/           # Elasticsearch schema
│   └── main-server/             # Primary database schema
├── shared-lib/                   # Shared libraries and utilities
├── types/                        # TypeScript type definitions
├── utils/                        # Application utilities
└── index.ts                      # Application entry point
```

## Core Architecture

### 1. Layered Architecture

The application follows a traditional layered architecture pattern:

```
┌─────────────────────────────────────┐
│        Presentation Layer          │  ← GraphQL/REST APIs
├─────────────────────────────────────┤
│        Business Logic Layer        │  ← Modules & Services
├─────────────────────────────────────┤
│        Data Access Layer           │  ← ORM & Models
├─────────────────────────────────────┤
│        Infrastructure Layer        │  ← External Services
└─────────────────────────────────────┘
```

### 2. Dependency Flow

- **Top-Down Dependencies**: Higher layers depend on lower layers
- **Dependency Injection**: Services are injected rather than instantiated
- **Interface Segregation**: Clear interfaces between layers
- **Inversion of Control**: Abstractions over concrete implementations

## Module System

### Module Structure Pattern

Each business module follows a consistent structure:

```
modules/[module-name]/
├── resolvers/                     # GraphQL resolvers
│   ├── mutations/                 # Mutation resolvers
│   │   ├── create-[entity].ts
│   │   ├── update-[entity].ts
│   │   └── delete-[entity].ts
│   ├── queries/                   # Query resolvers
│   │   ├── [entity].ts
│   │   └── [entities].ts
│   ├── field-resolvers/           # Field-level resolvers
│   ├── [module].admin.resolvers.ts
│   └── [module].common.resolvers.ts
├── services/                      # Business logic services
│   ├── create-[entity]-service.ts
│   ├── update-[entity]-service.ts
│   ├── delete-[entity]-service.ts
│   └── get-[entity]-service.ts
├── function/                      # Module-specific utilities
├── [module].graphql              # GraphQL schema definitions
├── [module].admin.graphql        # Admin-specific schema
└── [module]-logger.ts            # Module-specific logging
```

### Core Modules

#### 1. User Module (`modules/user/`)

**Purpose**: Comprehensive user management system with authentication, profile management, and preferences.

**Key Components**:
- **Authentication System**: Login, signup, password management, token handling
- **Profile Management**: User profile CRUD operations, image uploads
- **User Preferences**: Notification preferences, application settings
- **Account Security**: OTP verification, account deletion, mobile verification
- **Admin Management**: Admin user creation, bulk operations, user analytics

**Services**:
```typescript
// Authentication Services
- LoginUserService
- SignUpService
- RefreshTokenService
- ForgotPasswordService
- ChangePasswordService

// Profile Management Services
- UpdateProfileService
- GetUserService
- GetUsersListService
- DeleteUserService

// Security Services
- EmailVerificationService
- MobileOTPVerificationService
- SendDeleteUserOtpService
- VerifyDeleteUserOtpService

// Admin Services
- BulkUpdateService
- BulkDeleteService
- UserKpiDataService
```

**Key Features**:
- JWT-based authentication with refresh tokens
- Role-based access control (RBAC)
- Multi-factor authentication (Email + SMS OTP)
- Firebase authentication integration
- Comprehensive user analytics and KPIs
- Bulk operations for administrative tasks

#### 2. Event Module (`modules/event/`)

**Purpose**: Event management system with invitations, join requests, and scheduling.

**Key Components**:
- **Event Management**: CRUD operations for events
- **Invitation System**: Send and manage event invitations
- **Join Requests**: Handle user requests to join events
- **Event Filtering**: Search, filter, and sort events

**Services**:
```typescript
- CreateEventService
- UpdateEventService
- DeleteEventService
- GetEventService
- GetEventsService
- EventJoinRequestService
- EventInvitationService
```

**Key Features**:
- Event scheduling with date/time management
- Invitation status tracking (PENDING, ACCEPTED, REJECTED)
- Event ownership and permission management
- Advanced filtering and search capabilities
- Real-time event updates

#### 3. Notification Module (`modules/notification/`)

**Purpose**: Comprehensive notification system supporting multiple delivery channels.

**Key Components**:
- **Multi-channel Delivery**: In-app, email, SMS, push notifications
- **Notification Templates**: Configurable message templates
- **Preference Management**: User-configurable notification settings
- **Real-time Delivery**: WebSocket-based real-time notifications

**Services**:
```typescript
- CreateNotificationService
- GetNotificationsService
- MarkAsReadService
- NotificationPreferenceService
- SendNotificationService
```

#### 4. Config Module (`modules/config/`)

**Purpose**: Application configuration management with type safety and admin controls.

**Key Features**:
- **Dynamic Configuration**: Runtime configuration updates
- **Type Safety**: Strongly typed configuration values
- **Public/Private Configs**: Visibility control for different config types
- **Admin Management**: Administrative interface for config management

#### 5. Role & Permission Modules

**Purpose**: Comprehensive role-based access control system.

**Components**:
- **Role Management** (`modules/role/`): Define and manage user roles
- **Permission System** (`modules/role-permission/`): Fine-grained permissions
- **Access Control**: Integration with GraphQL directives and middleware

## Service Layer

### Service Architecture

The service layer implements the business logic and acts as an intermediary between controllers/resolvers and the data layer.

```typescript
// Service Pattern Example
export interface UserService {
  createUser(data: CreateUserInput): Promise<UserResponse>;
  getUserById(id: string): Promise<User>;
  updateUser(id: string, data: UpdateUserInput): Promise<UserResponse>;
  deleteUser(id: string): Promise<void>;
}

export class UserServiceImpl implements UserService {
  constructor(
    private userModel: UserModel,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async createUser(data: CreateUserInput): Promise<UserResponse> {
    // Business logic implementation
    // Validation, transformation, external service calls
    // Database operations through models
  }
}
```

### Service Responsibilities

1. **Business Logic**: Core application rules and workflows
2. **Data Validation**: Input validation and sanitization
3. **External Integrations**: Third-party service interactions
4. **Error Handling**: Business-specific error management
5. **Logging**: Operation logging and audit trails
6. **Caching**: Data caching strategies
7. **Transactions**: Database transaction management

## Data Layer

### Database Architecture

#### Sequelize ORM Configuration

```typescript
// sequelize-client.ts
export class SequelizeClient {
  public sequelize: Sequelize;
  public models: typeof db;

  constructor() {
    this.sequelize = new Sequelize(/* configuration */);
    this.initializeModels();
    this.setupAssociations();
  }
}
```

#### Model Structure

```typescript
// Model Pattern Example
export interface UserModelAttributes {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  // ... other attributes
}

export class User extends Model<UserModelAttributes> {
  declare id: CreationOptional<string>;
  declare email: string;
  // ... declarations

  static associate(models: typeof db) {
    // Model associations
  }
}
```

### Database Features

1. **Migrations**: Version-controlled schema changes
2. **Seeders**: Initial data population
3. **Associations**: Relationship management
4. **Validation**: Model-level data validation
5. **Hooks**: Lifecycle event handling
6. **Indexes**: Performance optimization
7. **Soft Deletes**: Paranoid deletion support

## Utility Libraries

### Shared Library (`shared-lib/`)

#### 1. Authentication & Security (`shared-lib/auth/`)
```typescript
- JWT token management
- Password hashing and validation
- Security utilities
```

#### 2. AWS Integration (`shared-lib/aws/`)
```typescript
- S3 file upload/download
- CloudFront CDN integration
- Signed URL generation
```

#### 3. Email Services (`shared-lib/email/`)
```typescript
- Email template management
- Multiple provider support (SendBay)
- Email queue processing
```

#### 4. Search Integration (`shared-lib/elastic-search/`)
```typescript
- Elasticsearch client configuration
- Search query builders
- Index management
```

#### 5. Queue Management (`shared-lib/queue/`)
```typescript
- Bull MQ integration
- Job processing
- Queue monitoring
```

#### 6. External Providers (`shared-lib/providers/`)
```typescript
- SMS providers (Twilio, MSG91)
- Storage providers (S3)
- Authentication providers (Firebase)
```

### Application Utilities (`utils/`)

#### 1. Authentication Utilities (`utils/auth/`)
```typescript
- JWT token utilities
- Password utilities
- Authentication middleware
```

#### 2. Internationalization (`utils/intl/`)
```typescript
- i18n configuration
- Locale service
- Language management
```

#### 3. REST Utilities (`utils/rest/`)
```typescript
- REST-specific helpers
- Request/response utilities
```

## Configuration Management

### Environment-based Configuration

```typescript
// config/config.ts
export interface AppConfig {
  NODE_ENV: string;
  PORT: number;
  DATABASE: DatabaseConfig;
  JWT: JWTConfig;
  AWS: AWSConfig;
  // ... other config sections
}

class ConfigManager {
  private static instance: ConfigManager;
  private config: AppConfig;

  public static getInstance(): ConfigManager {
    if (!ConfigManager.instance) {
      ConfigManager.instance = new ConfigManager();
    }
    return ConfigManager.instance;
  }

  getConfig(): AppConfig {
    return this.config;
  }
}
```

### Configuration Categories

1. **Server Configuration**: Host, port, environment
2. **Database Configuration**: Connection settings, pooling
3. **Authentication Configuration**: JWT settings, token expiration
4. **External Services**: API keys, endpoints, credentials
5. **Feature Flags**: Enable/disable application features
6. **Performance Settings**: Caching, rate limiting, timeouts

## Design Patterns

### 1. Dependency Injection Pattern

```typescript
// Service registration and injection
export class ServiceContainer {
  private services = new Map<string, any>();

  register<T>(token: string, service: T): void {
    this.services.set(token, service);
  }

  get<T>(token: string): T {
    return this.services.get(token);
  }
}
```

### 2. Repository Pattern

```typescript
// Data access abstraction
export interface UserRepository {
  findById(id: string): Promise<User>;
  create(data: CreateUserInput): Promise<User>;
  update(id: string, data: UpdateUserInput): Promise<User>;
  delete(id: string): Promise<void>;
}
```

### 3. Factory Pattern

```typescript
// Service factory for different providers
export class EmailServiceFactory {
  static create(provider: string): EmailService {
    switch (provider) {
      case 'SENDBAY':
        return new SendBayEmailService();
      default:
        throw new Error(`Unknown email provider: ${provider}`);
    }
  }
}
```

### 4. Observer Pattern

```typescript
// Event-driven architecture
export class EventEmitter {
  private listeners = new Map<string, Function[]>();

  on(event: string, listener: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(listener);
  }

  emit(event: string, data: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(listener => listener(data));
    }
  }
}
```

### 5. Middleware Pattern

```typescript
// Express middleware chain
export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  // Authentication logic
  next();
};

export const rateLimitMiddleware = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
```

### 6. Strategy Pattern

```typescript
// Different authentication strategies
export interface AuthStrategy {
  authenticate(credentials: any): Promise<AuthResult>;
}

export class EmailPasswordStrategy implements AuthStrategy {
  async authenticate(credentials: LoginCredentials): Promise<AuthResult> {
    // Email/password authentication logic
  }
}

export class FirebaseStrategy implements AuthStrategy {
  async authenticate(credentials: FirebaseCredentials): Promise<AuthResult> {
    // Firebase authentication logic
  }
}
```

## Code Quality Standards

### 1. TypeScript Configuration

```json
// tsconfig.json
{
  "compilerOptions": {
    "strict": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  }
}
```

### 2. ESLint Rules

- **Consistent code formatting**: Prettier integration
- **Import organization**: Structured import statements
- **Naming conventions**: Consistent naming patterns
- **Error handling**: Proper error handling patterns

### 3. Testing Strategy

```typescript
// Unit testing example
describe('UserService', () => {
  let userService: UserService;
  let mockUserModel: jest.Mocked<UserModel>;

  beforeEach(() => {
    mockUserModel = jest.createMockFromModule('../../models/user.model');
    userService = new UserService(mockUserModel);
  });

  it('should create user successfully', async () => {
    // Test implementation
  });
});
```

### 4. Documentation Standards

- **JSDoc Comments**: Comprehensive function documentation
- **README Files**: Module-level documentation
- **Type Definitions**: Clear interface definitions
- **API Documentation**: GraphQL schema documentation

## Performance Considerations

### 1. Database Optimization

- **Indexes**: Strategic indexing for query performance
- **Connection Pooling**: Efficient database connection management
- **Query Optimization**: N+1 query prevention
- **Caching**: Redis-based caching for frequently accessed data

### 2. Memory Management

- **Memory Leaks**: Proper event listener cleanup
- **Object Lifecycle**: Efficient object creation and disposal
- **Garbage Collection**: GC-friendly coding patterns

### 3. Asynchronous Operations

- **Promise Management**: Proper async/await usage
- **Concurrent Operations**: Efficient parallel processing
- **Error Propagation**: Proper error handling in async chains

This code structure provides a robust foundation for building scalable, maintainable applications with clear separation of concerns and well-defined architectural boundaries.