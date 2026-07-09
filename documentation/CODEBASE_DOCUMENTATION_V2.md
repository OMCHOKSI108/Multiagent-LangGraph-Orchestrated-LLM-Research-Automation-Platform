# Server Boilerplate TypeScript - Detailed Documentation (v2)

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Folder Structure & Explanations](#folder-structure--explanations)
3. [API Documentation](#api-documentation)
   - [GraphQL API](#graphql-api)
   - [REST API](#rest-api)
4. [Authentication & Authorization](#authentication--authorization)
5. [Caching](#caching)
6. [Error Handling](#error-handling)
7. [Testing & Development](#testing--development)

---

## Project Overview

This backend boilerplate is a scalable, modular Node.js/TypeScript application supporting both GraphQL and REST APIs. It features robust authentication, authorization, caching, internationalization, and more, making it suitable for modern SaaS and enterprise applications.

---

## Folder Structure & Explanations

### Root
- **package.json / tsconfig.json / Dockerfile / README.md**: Standard project configs, scripts, and documentation.
- **CODEBASE_DOCUMENTATION_V2.md**: This file. Complete codebase and API documentation.

### src/
- **index.ts**: Main entry point. Sets up Express, Apollo Server, middleware, and bootstraps the app.
- **start-apollo-server.ts**: Apollo Server initialization and configuration.
- **env-validator.ts**: Validates required environment variables.
- **sentry.ts**: Sentry error tracking integration.
- **sequelize-client.ts**: Sequelize (PostgreSQL ORM) client setup.
- **redis-client.ts**: Redis client setup and cache utility functions.
- **logger.ts**: Logger instance using Winston.

#### boot/
- **Purpose**: Bootstraps initial data (admin users, configs, roles, etc.) on app start.
- **Key files**: `create-admin-users.ts`, `create-configs.ts`, `create-role-data.ts`, `create-role-permission-data.ts`, `data/` (seed data arrays), `index.ts` (boot sequence).

#### config/
- **Purpose**: Centralized configuration management.
- **Key files**: `config.ts` (reads env vars, exports config object).

#### constants/
- **Purpose**: Application-wide constants (API, error, language, service).
- **Key files**: `api-constants.ts`, `error-type.ts`, `language-constants.ts`, `service-constants.ts`.

#### enums/
- **Purpose**: TypeScript enums for API, error, language, and service types.

#### directives/
- **Purpose**: Custom GraphQL directives for authentication, authorization, and rate limiting.
- **Key files**: `auth-directive.ts`, `has-permission.ts`, `has-role-directive.ts`, `rate-limit-directive.ts`, `index.ts` (directive registration).

#### functions/
- **Purpose**: Utility functions used across the codebase.

#### lib/
- **Purpose**: Placeholder for additional libraries.

#### logger/
- **Purpose**: Logger configuration and utilities.

#### modules/
- **Purpose**: Main business logic, organized by feature (user, config, role, etc.).

##### modules/config/
- **config.graphql**: GraphQL schema for config management.
- **configTypes.d.ts**: TypeScript types for configs.
- **resolvers/**: GraphQL resolvers (queries/mutations for configs).
- **services/**: Business logic for config CRUD, search, caching, etc.
- **config-logger.ts**: Logger for config module.
- **index.ts**: Module export.

##### modules/user/
- **user.common.graphql / user.admin.graphql**: GraphQL schemas for user management.
- **userTypes.d.ts**: TypeScript types for users.
- **resolvers/**: GraphQL resolvers (queries/mutations for users).
- **services/**: Business logic for user CRUD, authentication, etc.
- **user-logger.ts**: Logger for user module.

##### modules/role/
- **role.admin.graphql**: GraphQL schema for role management.
- **roleTypes.d.ts**: TypeScript types for roles.
- **resolvers/**: GraphQL resolvers (queries/mutations for roles).
- **services/**: Business logic for role CRUD, permissions, etc.
- **role-logger.ts**: Logger for role module.

##### modules/common/
- **common.graphql**: Shared GraphQL types and directives.
- **resolvers/**: Common resolvers (e.g., dynamic messages).
- **common-logger.ts**: Logger for common module.

#### providers/
- **Purpose**: Integrations with external services (auth, email, storage, SMS).

#### pubsub/
- **Purpose**: PubSub (publish/subscribe) utilities for real-time features.

#### rest/
- **Purpose**: REST API endpoints, middlewares, and modules.
- **routes/**: Route definitions.
- **middlewares/**: Express middlewares (auth, error handling, rate limiting, etc.).
- **modules/**: REST modules (if any).

#### scalars/
- **Purpose**: Custom GraphQL scalars (e.g., Limit).

#### schema/
- **Purpose**: Database schema, models, migrations, and enums.
- **main-server/models/**: Sequelize models for all entities.
- **main-server/enums/**: Enum definitions for DB fields.
- **main-server/migrations/**: Migration scripts.

#### shared-lib/
- **Purpose**: Shared libraries/utilities (AWS, email, error handling, firebase, queue, etc.).
- **aws/**: AWS S3/CloudFront utilities.
- **email/**: Email templates and utilities.
- **error-handler/**: Custom error classes and handlers.
- **firebase/**: Firebase integration.
- **graphql/**: GraphQL plugins/utilities.
- **hive-moderation/**: Content moderation.
- **imgix/**: Image processing.
- **logger/**: Logging utilities.
- **providers/**: Service provider integrations.
- **pusher/**: Real-time notifications.
- **queue/**: Queue management (BullMQ).
- **queue-processor/**: Queue processors.
- **types/**: Shared TypeScript types.
- **utils/**: Shared utility functions.

#### types/
- **Purpose**: Global TypeScript types and interfaces.

#### utils/
- **Purpose**: Utility functions for auth, i18n, REST, etc.
- **auth/**: Authentication-related utilities.
  - `add-request-meta-to-ctx.ts`: Adds request metadata to GraphQL context.
  - `encryption.ts`: Functions for encrypting/decrypting data.
  - `generate-token.ts`: Generates random tokens for various purposes.
  - `get-decoded-token.ts`: Decodes JWT tokens.
  - `get-user.ts`: Extracts user info from request/context.
  - `jwt/`: JWT-specific utilities:
    - `decode-token.ts`: Decodes JWT tokens.
    - `generate-access-token.ts`: Generates JWT access tokens.
    - `generate-refresh-token.ts`: Generates JWT refresh tokens.
    - `generate-reset-token.ts`: Generates password reset tokens.
    - `generate-verification-token.ts`: Generates email verification tokens.
    - `index.ts`: JWT utility index.
  - `password.ts`: Password hashing and comparison utilities.
- **common.ts**: General-purpose utility functions (e.g., `pick`, `omit`, `isEmpty`, etc.).
- **cors-options.ts**: Configures CORS options for Express.
- **get-header-value.ts**: Safely retrieves header values from requests.
- **introspection-restriction-middleware.ts**: Middleware to restrict GraphQL introspection in production.
- **messages.ts**: Centralized message constants for responses and errors.
- **query-length-middleware.ts**: Middleware to limit GraphQL query length.
- **intl/**: Internationalization (i18n) utilities.
  - `add-locale-service-to-ctx.ts`: Adds locale service to GraphQL context.
  - `i18n-config.ts`: Loads and configures i18n settings.
  - `locale-service.ts`: LocaleService class for managing translations.
  - `locales/`: JSON files for supported languages (e.g., `en.json`, `es.json`).
- **rest/**: REST-specific utilities.
  - `api-error.ts`: Standardizes API error responses.
  - `generate-response.ts`: Formats REST API responses.
  - `get-decoded-token.ts`: Decodes JWT tokens for REST requests.
  - `get-user.ts`: Extracts user info from REST requests.

---

## API Documentation

### GraphQL API

#### Authentication
- JWT-based authentication for most queries/mutations.
- Role-based access control using `@hasRole` directive.
- Rate limiting using `@rateLimit` directive.

#### Main Endpoints (examples)

**Config Management**
- `configs(filter, sort): ConfigsResponse` — List all configs (admin only, paginated, searchable)
- `publicConfigs(filter, sort): PublicConfigsResponse` — List public configs (paginated, searchable, cached)
- `config(where): ConfigResponse` — Get single config by ID
- `createConfig(data): CreateConfigResponse` — Create new config
- `updateConfig(where, data): UpdateConfigResponse` — Update config
- `deleteConfig(where): CommonMessageResponse` — Delete config

**User Management**
- `users(filter, sort): UsersResponse` — List users (admin only)
- `user(where): UserResponse` — Get user by ID
- `signUp(data): SignUpResponse` — Register new user
- `loginUser(data): LoginResponse` — User login
- `me: User` — Get current user profile

**Role Management**
- `roles(filter, sort): RolesRes` — List roles
- `role(where): Role` — Get role by ID
- `createRole(data): CreateRoleResponse` — Create new role
- `updateRole(where, data): UpdateRoleResponse` — Update role
- `deleteRole(where): CommonMessageResponse` — Delete role

**Common**
- `dynamicMessage(name): CommonMessageResponse` — Get dynamic message by name

#### Example Query & Response

**Get Public Configs**
```graphql
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
```
**Example Response:**
```json
{
  "data": {
    "publicConfigs": {
      "data": [
        {
          "id": "1",
          "key": "API_VERSION",
          "value": "v2",
          "dataType": "STRING",
          "type": "PUBLIC",
          "createdAt": "2024-06-27T10:00:00.000Z"
        }
      ],
      "count": 1
    }
  }
}
```
**Key Explanations:**
- `data`: The main response object for the query.
- `publicConfigs`: The field queried, containing the result.
- `data`: Array of config objects.
  - `id`: Unique identifier for the config.
  - `key`: Config key name.
  - `value`: Config value (string, int, or boolean as string).
  - `dataType`: Data type of the config (`STRING`, `INTEGER`, `BOOLEAN`).
  - `type`: Config type (`PUBLIC`, `PRIVATE`, `PROTECTED`).
  - `createdAt`: ISO timestamp of creation.
- `count`: Total number of configs matching the filter.

**Get Single Config**
```graphql
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
**Example Response:**
```json
{
  "data": {
    "config": {
      "data": {
        "id": "1",
        "key": "API_VERSION",
        "value": "v2",
        "dataType": "STRING",
        "type": "PUBLIC"
      },
      "message": "Config fetched successfully!"
    }
  }
}
```
**Key Explanations:**
- `data`: The main response object.
- `config`: The field queried.
- `data`: The config object (see above for keys).
- `message`: Success message.

**Create/Update/Delete Config**
- All return a `message` key with a status string, and for create/update, a `data` key with the config object.

**Error Response Example:**
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
**Key Explanations:**
- `errors`: Array of error objects.
  - `message`: Human-readable error message.
  - `extensions.code`: Error code (e.g., `NOT_FOUND`, `BAD_REQUEST`).
  - `extensions.type`: Error type (usually `CUSTOM_GRAPHQL_ERROR`).

**User Authentication Example**
```graphql
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
```
**Example Response:**
```json
{
  "data": {
    "loginUser": {
      "user": {
        "id": "123",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe"
      },
      "accessToken": "jwt-access-token",
      "refreshToken": "jwt-refresh-token"
    }
  }
}
```
**Key Explanations:**
- `user`: The authenticated user object.
- `accessToken`: JWT access token for API requests.
- `refreshToken`: JWT refresh token for session renewal.

### REST API

#### Main Endpoints (examples)
- `POST /api/v1/auth/login` — User login
- `POST /api/v1/auth/register` — User registration
- `POST /api/v1/auth/logout` — User logout
- `POST /api/v1/auth/refresh-token` — Refresh JWT token
- `POST /api/v1/upload/signed-url` — Get signed URL for file upload
- `GET /api/v1/upload/signed-url` — Get signed URL for file download

**Example: User Login**
- **Request:**
  ```json
  {
    "email": "user@example.com",
    "password": "password123"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "message": "Logged in successfully!",
    "user": {
      "id": "123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe"
    },
    "accessToken": "jwt-access-token",
    "refreshToken": "jwt-refresh-token"
  }
  ```
- **Key Explanations:**
  - `status`: Status of the operation (`success` or `error`).
  - `message`: Human-readable message.
  - `user`: The authenticated user object.
  - `accessToken`: JWT access token.
  - `refreshToken`: JWT refresh token.

- **Error Response:**
  ```json
  {
    "status": "error",
    "message": "Invalid credentials!"
  }
  ```
  - `status`: Always `error` for failed requests.
  - `message`: Error message.

**Example: Get Signed URL**
- **Request:**
  ```json
  {
    "fileName": "avatar.png",
    "fileType": "image/png"
  }
  ```
- **Success Response:**
  ```json
  {
    "signedUrl": "https://s3.amazonaws.com/bucket/avatar.png?...",
    "key": "avatar.png"
  }
  ```
- **Key Explanations:**
  - `signedUrl`: The pre-signed URL for uploading/downloading the file.
  - `key`: The S3 object key.

---

## Authentication & Authorization
- JWT-based authentication for both GraphQL and REST
- Role-based access control (RBAC) using `@hasRole` directive and middleware
- Permission-based checks using `@hasPermission` directive
- Rate limiting using `@rateLimit` directive and REST middleware

---

## Caching
- Redis is used for caching frequently accessed data (e.g., public configs)
- Cache keys are generated based on query parameters
- Cache is invalidated on config update/delete
- Utility functions: `getCachedData`, `setCacheData`, `purgeCacheByKey`

---

## Error Handling
- Centralized error handling for both GraphQL and REST
- Custom error classes (e.g., `CustomGraphqlError`)
- Standardized error response format
- Error logging using Winston and Sentry

---

## Testing & Development
- Linting: ESLint with TypeScript support
- Pre-commit and pre-push hooks: Husky
- Testing: (Add your test framework and structure here)
- Docker support for local development and production
- CI/CD: GitLab CI (see `.gitlab-ci.yml`)

---

## Function/Service/Resolver Explanations (by module)

### Config Module
- **services/configs-service.ts**: Handles paginated, searchable config listing for admins.
- **services/public-configs-service.ts**: Handles paginated, searchable, cached public config listing.
- **services/create-config-service.ts**: Handles config creation, with validation and logging.
- **services/update-config-service.ts**: Handles config update, purges cache after update.
- **services/delete-config-service.ts**: Handles config deletion, purges cache after delete.
- **resolvers/queries/**: GraphQL query resolvers for configs.
- **resolvers/mutations/**: GraphQL mutation resolvers for configs.

### User Module
- **services/**: Business logic for user CRUD, authentication, password, profile, etc.
- **resolvers/queries/**: GraphQL query resolvers for users (me, user, users, etc.).
- **resolvers/mutations/**: GraphQL mutation resolvers for user actions (sign up, login, update, etc.).

### Role Module
- **services/**: Business logic for role CRUD, permission assignment, etc.
- **resolvers/queries/**: GraphQL query resolvers for roles.
- **resolvers/mutations/**: GraphQL mutation resolvers for roles.

### Common Module
- **resolvers/queries/dynamic-message.ts**: Returns dynamic messages for the app (i18n, etc.).

### Shared Libraries
- **shared-lib/aws/**: AWS S3/CloudFront utilities for file storage and signed URLs.
- **shared-lib/email/**: Email templates and sending utilities.
- **shared-lib/error-handler/**: Custom error classes and error handling utilities.
- **shared-lib/queue/**: BullMQ queue management for background jobs.
- **shared-lib/utils/**: General utility functions (formatting, validation, etc.).

### Utilities
- **utils/auth/**: Token generation, encryption, password hashing, etc.
- **utils/intl/**: Internationalization (i18n) utilities and locale files.
- **utils/rest/**: REST-specific utilities (error formatting, response generation, etc.).
- **utils/common.ts**: General-purpose utility functions.

---

## For More Information
- See `README.md` for setup and quickstart.
- See `CODEBASE_DOCUMENTATION.md` for high-level documentation.
- Explore each module's README (if present) for more details. 