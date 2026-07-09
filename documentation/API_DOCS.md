# Server Boilerplate TypeScript - API Documentation

## Overview

This API documentation covers a comprehensive TypeScript server boilerplate built with **Node.js**, **Express.js**, **GraphQL**, and **PostgreSQL**. The application provides a complete authentication system, user management, role-based access control, event management, and notification system.

## Table of Contents

1. [API Endpoints](#api-endpoints)
2. [GraphQL Schema](#graphql-schema)
3. [Authentication](#authentication)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [Request/Response Examples](#requestresponse-examples)

## API Endpoints

### Base URL
- **Production**: `https://your-domain.com`
- **Development**: `http://localhost:3000` (configurable via PORT env variable)

### API Prefix
All REST API endpoints are prefixed with: `/api/v1`
GraphQL endpoint: `/api/graphql`

## REST API Endpoints

### Authentication Endpoints

#### Base Route: `/api/v1/auth`

| Method | Endpoint | Description | Authentication | Rate Limit |
|--------|----------|-------------|----------------|------------|
| GET | `/health` | Health check endpoint | None | None |

### User Management Endpoints

#### Base Route: `/api/v1/users`

| Method | Endpoint | Description | Authentication | Rate Limit |
|--------|----------|-------------|----------------|------------|
| POST | `/list` | Get paginated list of users | Required | Standard |
| POST | `/create` | Create a new user | Required | Standard |
| GET | `/:id` | Get user by ID | Required | Standard |
| POST | `/bulk-update` | Bulk update users | Required | Standard |
| DELETE | `/bulk-delete` | Bulk delete users | Required | Standard |

#### Admin User Management

| Method | Endpoint | Description | Authentication | Rate Limit |
|--------|----------|-------------|----------------|------------|
| POST | `/admin` | Get paginated list of admin users | Required | Standard |
| POST | `/admin/create` | Create a new admin user | Required | Standard |
| GET | `/admin/:id` | Get admin user by ID | Required | Standard |
| POST | `/admin/bulk-update` | Bulk update admin users | Required | Standard |
| DELETE | `/admin/bulk-delete` | Bulk delete admin users | Required | Standard |

### Queue Management

| Endpoint | Description | Authentication |
|----------|-------------|----------------|
| `/jobs/queues` | Bull Board queue management interface | Required |

### System Endpoints

| Method | Endpoint | Description | Authentication |
|--------|----------|-------------|----------------|
| GET | `/api/version` | Get API version information | None |

## GraphQL Schema

### Core Directives

```graphql
directive @isAuthenticated on FIELD_DEFINITION
directive @hasRole(roles: [String]) on FIELD_DEFINITION
directive @hasPermission(permissions: [JSON]) on FIELD_DEFINITION
directive @rateLimit(max: Int, window: String, message: String, identityArgs: [String], arrayLengthField: String) on FIELD_DEFINITION
directive @constraint(/* validation parameters */) on INPUT_FIELD_DEFINITION | FIELD_DEFINITION | ARGUMENT_DEFINITION
```

### Scalar Types

```graphql
scalar DateTime
scalar JSON
scalar Limit
```

### Common Types

```graphql
type CommonMessageResponse {
  message: String
}

type SignedUrlResponse {
  signedUrl: String
  key: String
}

enum SortOrder {
  ASC
  DESC
}
```

## User Management API

### User Type

```graphql
type User {
  id: ID
  email: String
  firstName: String
  lastName: String
  profileImage: String
  roles: [String]
  lastActiveOn: DateTime
  mobileNo: String
  createdAt: DateTime
  updatedAt: DateTime
  unReadCount: Int
  disabledAt: DateTime
  disabledBy: ID
  address1: String
  address2: String
  city: String
  state: String
  country: String
  zipcode: String
}
```

### Authentication Queries

```graphql
type Query {
  me: User @isAuthenticated
  getProfileImageUploadSignedUrl(data: GetProfileImageUploadSignedUrlInput!): SignedUrlResponse @isAuthenticated @rateLimit(window: "1m", max: 5)
  userPreference(filter: UserPreferenceFilterInput!): UserPreference @isAuthenticated @rateLimit(window: "1m", max: 50)
}
```

### Authentication Mutations

```graphql
type Mutation {
  # User Registration & Login
  signUp(data: SignUpInput!): CommonMessageResponse @rateLimit(window: "1m", max: 5)
  loginUser(data: LoginUserInput!): LoginResponse
  firebaseLogin(data: FirebaseLoginDataInput!): LoginResponse @rateLimit(window: "1m", max: 5)
  logoutUser: LogoutResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 5)
  
  # Password Management
  forgotPassword(data: ForgotPasswordInput!): CommonMessageResponse @rateLimit(window: "1m", max: 5)
  updatePassword(data: UpdatePasswordInput!): CommonMessageResponse
  changePassword(data: ChangePasswordInput!): CommonMessageResponse @isAuthenticated @rateLimit(window: "1m", max: 50)
  verifyResetToken(data: VerifyResetTokenInput!): CommonMessageResponse @rateLimit(window: "1m", max: 5)
  
  # Token Management
  refreshToken(data: RefreshTokenInput!): RefreshTokenResponse @rateLimit(window: "1m", max: 5)
  
  # Email Verification
  emailVerificationUser(data: EmailVerificationUserInput!): CommonMessageResponse @rateLimit(window: "1m", max: 5)
  emailOTPVerification(data: EmailOTPVerificationInput!): CommonMessageResponse @rateLimit(window: "1m", max: 5)
  resendOTPVerificationEmail(data: ResendOTPInput!): CommonMessageResponse @rateLimit(window: "1m", max: 5)
  resendVerificationEmailUser(where: ResendVerificationEmailUserWhereInput!): CommonMessageResponse @rateLimit(window: "1m", max: 5)
  verifyEmailVerificationToken(data: VerifyEmailVerificationTokenInput!): CommonMessageResponse @rateLimit(window: "1m", max: 5)
  
  # Mobile Verification
  sendMobileVerifyOtp: CommonMessageResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 5)
  mobileOtpVerification(data: MobileOTPVerificationInput!): CommonMessageResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 5)
  
  # Profile Management
  updateUser(data: UpdateUserInput!): UpdateUserResponse @isAuthenticated
  
  # User Deletion
  sendDeleteUserOtp: CommonMessageResponse @isAuthenticated @rateLimit(window: "1m", max: 5)
  verifyDeleteUserOtp(data: VerifyDeleteUserOtpData!): CommonMessageResponse @isAuthenticated @rateLimit(window: "1m", max: 5)
  deleteUser: CommonMessageResponse @isAuthenticated @rateLimit(window: "1m", max: 50)
  
  # User Preferences
  upsertUserPreference(data: UpsertUserPreferenceInput!): UpsertUserPreferenceResponse @isAuthenticated @rateLimit(window: "1m", max: 50)
}
```

### Input Types

```graphql
input SignUpInput {
  email: String! @constraint(minLength: 1, format: "email")
  password: String! @constraint(pattern: "^.{8,}$")
  firstName: String
  lastName: String
  timezone: String
  mobileNo: String
  address1: String
  address2: String
  city: String
  state: String
  country: String
  zipcode: String
}

input LoginUserInput {
  email: String! @constraint(minLength: 1, format: "email")
  password: String!
}

input UpdateUserInput {
  firstName: String
  lastName: String
  profileImage: String
  mobileNo: String
  address1: String
  address2: String
  city: String
  state: String
  country: String
  zipcode: String
}
```

## Event Management API

### Event Type

```graphql
type Event {
  id: ID
  userId: String
  title: String
  description: String
  isOwnerEvent: Boolean
  inviteeStatus: InviteeStatus
  eventDate: DateTime
  createdAt: DateTime
  updatedAt: DateTime
  user: User
}
```

### Event Queries

```graphql
type Query {
  event(where: EventUniqueInput!): EventResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 50)
  events(filter: EventFilters, sort: [EventSort]): EventsResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 50)
}
```

### Event Mutations

```graphql
type Mutation {
  createEvent(data: CreateEventInput!): CreateEventResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 50)
  updateEvent(where: EventUniqueInput!, data: UpdateEventInput!): CreateEventResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 50)
  deleteEvent(where: DeleteEventUniqueInput!): CommonMessageResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 50)
  createEventJoinRequest(where: EventUniqueInput!): CommonMessageResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 50)
  updateEventJoinRequest(where: EventUniqueInput!, data: UpdateEventJoinRequestInput): CommonMessageResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 50)
  sendEventInvitation(where: EventUniqueInput!, data: UserWhereUniqueInput): CommonMessageResponse @hasRole(roles: ["USER"]) @rateLimit(window: "1m", max: 5)
}
```

### Event Input Types

```graphql
input CreateEventInput {
  title: String!
  description: String!
  eventDate: DateTime!
}

input EventFilters {
  skip: Int
  limit: Limit
  search: String
  dateRange: DateRangeInputFilter
  type: EventType
}

enum EventType {
  ALL
  UPCOMING
  PAST
}

enum InviteeStatus {
  JOIN
  PENDING
  ACCEPTED
  REJECTED
  INVITED
  OWNER
}
```

## Configuration Management API

### Config Queries

```graphql
type Query {
  config(where: ConfigWhereUniqueInput!): ConfigResponse @hasRole(roles: ["ADMIN"])
  configs(filter: ConfigFiltersInput!, sort: ConfigSortInput): ConfigsResponse @hasRole(roles: ["ADMIN"])
  publicConfigs(filter: PublicConfigFiltersInput!): PublicConfigsResponse
}
```

### Config Mutations

```graphql
type Mutation {
  createConfig(data: CreateConfigInput!): CreateConfigResponse @hasRole(roles: ["ADMIN"])
  updateConfig(where: ConfigWhereUniqueInput!, data: UpdateConfigInput!): UpdateConfigResponse @hasRole(roles: ["ADMIN"])
  deleteConfig(where: ConfigWhereUniqueInput!): CommonMessageResponse @hasRole(roles: ["ADMIN"])
}
```

## Role and Permission Management

### Role Queries

```graphql
type Query {
  role(where: RoleWhereUniqueInput!): RoleResponse @hasRole(roles: ["ADMIN"])
  roles(filter: RolesFilterInput, sort: RolesSortInput): RolesResponse @hasRole(roles: ["ADMIN"])
  rolePermissions(filter: RolePermissionFiltersInput!): RolePermissionsResponse @hasRole(roles: ["ADMIN"])
}
```

### Role Mutations

```graphql
type Mutation {
  createRole(data: CreateRoleInput!): CreateRoleResponse @hasRole(roles: ["ADMIN"])
  updateRole(where: RoleWhereUniqueInput!, data: UpdateRoleInput!): UpdateRoleResponse @hasRole(roles: ["ADMIN"])
  deleteRole(where: RoleWhereUniqueInput!): CommonMessageResponse @hasRole(roles: ["ADMIN"])
}
```

## UI Label Management

### UI Label Queries

```graphql
type Query {
  uiLabel(where: UILabelWhereUniqueInput!): UILabelResponse @hasRole(roles: ["ADMIN"])
  uiLabels(filter: UILabelFiltersInput, sort: UILabelSortInput): UILabelsResponse
}
```

### UI Label Mutations

```graphql
type Mutation {
  createUiLabel(data: CreateUILabelInput!): CreateUILabelResponse @hasRole(roles: ["ADMIN"])
  updateUiLabel(where: UILabelWhereUniqueInput!, data: UpdateUILabelInput!): UpdateUILabelResponse @hasRole(roles: ["ADMIN"])
  deleteUiLabel(where: UILabelWhereUniqueInput!): CommonMessageResponse @hasRole(roles: ["ADMIN"])
}
```

## Authentication

### JWT Authentication

The API uses JWT (JSON Web Tokens) for authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your_jwt_token>
```

### Token Types

1. **Access Token**: Used for API authentication (configurable lifetime via `JWT_LIFE_TIME`)
2. **Refresh Token**: Used to refresh access tokens (longer lifetime)
3. **Reset Token**: Used for password reset flows (`JWT_RESET_TOKEN_LIFE_TIME`)
4. **Verification Token**: Used for email verification (`JWT_VERIFICATION_TOKEN_LIFE_TIME`)

### Authentication Flow

1. **Sign Up**: `signUp` mutation
2. **Login**: `loginUser` mutation
3. **Email Verification**: `emailVerificationUser` mutation
4. **Refresh Token**: `refreshToken` mutation
5. **Logout**: `logoutUser` mutation

### Firebase Authentication

The API also supports Firebase authentication via the `firebaseLogin` mutation.

## Rate Limiting

Rate limiting is implemented using the `@rateLimit` directive in GraphQL and express-rate-limit middleware for REST endpoints.

### Common Rate Limits

- **Authentication operations**: 5 requests per minute
- **Standard operations**: 50 requests per minute
- **Data modification**: 50 requests per minute

### Rate Limit Configuration

Rate limits can be bypassed using the `RATE_LIMIT_BYPASS_SECRET` environment variable.

## Error Handling

### GraphQL Errors

GraphQL errors follow the standard GraphQL error format:

```json
{
  "errors": [
    {
      "message": "Error message",
      "extensions": {
        "code": "ERROR_CODE",
        "exception": {
          "stacktrace": ["..."]
        }
      }
    }
  ]
}
```

### REST API Errors

REST API errors follow standard HTTP status codes:

- `400`: Bad Request
- `401`: Unauthorized
- `403`: Forbidden
- `404`: Not Found
- `422`: Validation Error
- `429`: Too Many Requests
- `500`: Internal Server Error

## Request/Response Examples

### User Sign Up

**Request:**
```graphql
mutation SignUp($data: SignUpInput!) {
  signUp(data: $data) {
    message
  }
}
```

**Variables:**
```json
{
  "data": {
    "email": "user@example.com",
    "password": "securePassword123",
    "firstName": "John",
    "lastName": "Doe",
    "timezone": "America/New_York"
  }
}
```

**Response:**
```json
{
  "data": {
    "signUp": {
      "message": "User registered successfully. Please verify your email."
    }
  }
}
```

### User Login

**Request:**
```graphql
mutation LoginUser($data: LoginUserInput!) {
  loginUser(data: $data) {
    message
    data {
      id
      email
      firstName
      lastName
      roles
    }
    accessToken
    refreshToken
  }
}
```

**Variables:**
```json
{
  "data": {
    "email": "user@example.com",
    "password": "securePassword123"
  }
}
```

**Response:**
```json
{
  "data": {
    "loginUser": {
      "message": "Login successful",
      "data": {
        "id": "uuid-here",
        "email": "user@example.com",
        "firstName": "John",
        "lastName": "Doe",
        "roles": ["USER"]
      },
      "accessToken": "jwt-access-token-here",
      "refreshToken": "jwt-refresh-token-here"
    }
  }
}
```

### Create Event

**Request:**
```graphql
mutation CreateEvent($data: CreateEventInput!) {
  createEvent(data: $data) {
    message
    data {
      id
      title
      description
      eventDate
      user {
        id
        firstName
        lastName
      }
    }
  }
}
```

**Variables:**
```json
{
  "data": {
    "title": "Team Meeting",
    "description": "Monthly team sync meeting",
    "eventDate": "2023-12-01T10:00:00Z"
  }
}
```

### Get Events with Filters

**Request:**
```graphql
query GetEvents($filter: EventFilters, $sort: [EventSort]) {
  events(filter: $filter, sort: $sort) {
    count
    data {
      id
      title
      description
      eventDate
      isOwnerEvent
      inviteeStatus
      user {
        id
        firstName
        lastName
      }
    }
  }
}
```

**Variables:**
```json
{
  "filter": {
    "skip": 0,
    "limit": 10,
    "type": "UPCOMING",
    "search": "team"
  },
  "sort": [
    {
      "sortOn": "eventDate",
      "sortBy": "ASC"
    }
  ]
}
```

### REST API Example - Get User

**Request:**
```http
GET /api/v1/users/uuid-here
Authorization: Bearer <your_jwt_token>
```

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "uuid-here",
    "email": "user@example.com",
    "firstName": "John",
    "lastName": "Doe",
    "roles": ["USER"],
    "createdAt": "2023-01-01T00:00:00Z",
    "updatedAt": "2023-01-01T00:00:00Z"
  }
}
```

## Environment Configuration

Key environment variables for API configuration:

```env
# Server Configuration
NODE_ENV=development
HOST=localhost
PORT=3000
API_PREFIX_ROUTE=api

# Database
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=your_db_name
POSTGRES_USERNAME=your_db_user
POSTGRES_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your_jwt_secret
JWT_LIFE_TIME=1h
JWT_REFRESH_TOKEN_LIFE_TIME=7d
JWT_RESET_TOKEN_LIFE_TIME=15m
JWT_VERIFICATION_TOKEN_LIFE_TIME=24h

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_BYPASS_SECRET=your_bypass_secret

# GraphQL Configuration
QUERY_DEPTH_LIMIT=10
QUERY_LENGTH_LIMIT=10000
COMPLEXITY_THRESHOLD=1000
ALLOW_INTROSPECTION=false
GRAPHQL_INTROSPECTION_RESTRICTION_ENABLED=true
GRAPHQL_INTROSPECTION_RESTRICTION_SECRET=your_introspection_secret
```

## Additional Features

### Timestamp Validation
- Requests can include timestamp validation
- Configurable via `TIMESTAMP_VALIDATION_ENABLED`
- Bypass available with `TIMESTAMP_VALIDATION_BYPASS_SECRET`

### Input Trimming
- Global input trimming via `TRIM_INPUT` environment variable
- Override per field with `@skipTrim` directive

### Pagination
- Configurable limits via `QUERY_PAGING_MIN_COUNT` and `QUERY_PAGING_MAX_COUNT`
- Default pagination for list queries

### File Upload
- S3 integration for file storage
- Signed URL generation for secure uploads
- CloudFront integration for CDN delivery

### Queue Management
- Bull MQ for background job processing
- Web interface at `/jobs/queues`
- Support for import/export jobs and email sending

This API provides a comprehensive foundation for building scalable web applications with proper authentication, authorization, and data management capabilities.