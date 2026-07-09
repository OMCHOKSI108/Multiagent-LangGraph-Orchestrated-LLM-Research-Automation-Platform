# Database Schema Documentation

## Overview

The Server Boilerplate TypeScript application uses **PostgreSQL** as the primary database with **Sequelize ORM** for data modeling and migrations. The database is designed to support a comprehensive user management system with authentication, role-based access control, event management, notifications, and configuration management.

## Table of Contents

1. [Database Configuration](#database-configuration)
2. [Core Tables](#core-tables)
3. [Entity Relationships](#entity-relationships)
4. [Indexes and Performance](#indexes-and-performance)
5. [Data Types and Enums](#data-types-and-enums)
6. [Database Features](#database-features)

## Database Configuration

### Connection Settings
```typescript
// Environment Variables
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DATABASE=your_database_name
POSTGRES_USERNAME=your_username
POSTGRES_PASSWORD=your_password
```

### Sequelize Configuration
- **ORM**: Sequelize v6
- **Dialect**: PostgreSQL
- **Features**: Paranoid deletes, Timestamps, Underscored naming
- **Migrations**: Sequelize CLI for schema versioning

## Core Tables

### 1. Users Table (`users`)

**Purpose**: Stores application user accounts with comprehensive profile and authentication data.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique user identifier |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | User email address |
| `password` | VARCHAR(255) | NULL | Hashed password (bcrypt) |
| `first_name` | VARCHAR(50) | NULL | User's first name |
| `last_name` | VARCHAR(50) | NULL | User's last name |
| `profile_image` | VARCHAR(1000) | NULL | URL to profile image |
| `mobile_no` | VARCHAR(255) | NULL | Mobile phone number |
| `is_mobile_verified` | BOOLEAN | DEFAULT false | Mobile verification status |
| `mobile_otp` | VARCHAR(255) | NULL | Mobile OTP for verification |
| `mobile_otp_expire_time` | TIMESTAMP | NULL | Mobile OTP expiration |
| `otp` | VARCHAR(255) | NULL | General OTP for verification |
| `wrong_otp_attempt` | INTEGER | DEFAULT 0 | Failed OTP attempt counter |
| `otp_expire_time` | TIMESTAMP | NULL | OTP expiration time |
| `refresh_token` | VARCHAR(1000) | NULL | JWT refresh token |
| `timezone` | VARCHAR(255) | NULL | User's timezone |
| `notification_preference` | JSONB[] | NULL | Notification preferences |
| `default_workspace` | UUID | NULL | Default workspace reference |
| `roles` | VARCHAR[] | DEFAULT ['USER'] | User roles array |
| `auth_service` | ENUM | DEFAULT 'EMAIL_PASSWORD' | Authentication service type |
| `auth_service_id` | VARCHAR(255) | NULL | External auth service ID |
| `auth_service_ref_data` | JSONB | NULL | External auth reference data |
| `verification_token` | VARCHAR(255) | NULL | Email verification token |
| `verified_on` | TIMESTAMP | NULL | Email verification timestamp |
| `address1` | VARCHAR(255) | NULL | Primary address |
| `address2` | VARCHAR(255) | NULL | Secondary address |
| `city` | VARCHAR(255) | NULL | City |
| `state` | VARCHAR(255) | NULL | State/Province |
| `country` | VARCHAR(255) | NULL | Country |
| `zipcode` | VARCHAR(255) | NULL | Postal code |
| `created_by` | UUID | NULL, FK → admin_users.id | Creator admin user |
| `disabled_by` | UUID | NULL, FK → admin_users.id | Admin who disabled user |
| `disabled_at` | TIMESTAMP | NULL | Disable timestamp |
| `created_at` | TIMESTAMP | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMP | NOT NULL | Record update time |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

**Indexes:**
- `users_email_index` (UNIQUE) on `email`
- `users_first_name_index` on `first_name`
- `users_last_name_index` on `last_name`
- `combined_user_index` on `first_name, last_name`

### 2. Admin Users Table (`admin_users`)

**Purpose**: Stores administrator accounts with elevated permissions and management capabilities.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique admin identifier |
| `email` | VARCHAR(255) | NOT NULL, UNIQUE | Admin email address |
| `password` | VARCHAR(255) | NULL | Hashed password |
| `first_name` | VARCHAR(255) | NULL | Admin's first name |
| `last_name` | VARCHAR(255) | NULL | Admin's last name |
| `profile_image` | VARCHAR(1024) | NULL | Profile image URL |
| `mobile_no` | VARCHAR(255) | NULL | Mobile phone number |
| `refresh_token` | TEXT | NULL | JWT refresh token |
| `auth_service` | ENUM | DEFAULT 'EMAIL_PASSWORD' | Authentication service |
| `auth_service_id` | VARCHAR(255) | NULL | External auth service ID |
| `auth_service_ref_data` | JSONB | NULL | External auth data |
| `verification_token` | VARCHAR(255) | NULL | Email verification token |
| `roles` | VARCHAR[] | DEFAULT ['ADMIN'] | Admin roles |
| `is_verified` | BOOLEAN | DEFAULT false | Email verification status |
| `meta_data` | JSONB | NULL | Additional metadata |
| `permissions` | VARCHAR[] | DEFAULT [] | Specific permissions |
| `created_by` | UUID | NULL, FK → admin_users.id | Creator admin |
| `disabled_by` | UUID | NULL, FK → admin_users.id | Admin who disabled |
| `disabled_at` | TIMESTAMP | NULL | Disable timestamp |
| `created_at` | TIMESTAMP | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMP | NOT NULL | Record update time |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

**Indexes:**
- Index on `first_name`
- Index on `last_name`
- Index on `email`
- Combined index on `first_name, last_name, email`

### 3. Events Table (`events`)

**Purpose**: Stores user-created events with scheduling information.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY, DEFAULT uuid_generate_v4() | Unique event identifier |
| `user_id` | UUID | NOT NULL, FK → users.id | Event creator |
| `title` | VARCHAR(255) | NOT NULL | Event title |
| `description` | TEXT | NOT NULL | Event description |
| `event_date` | TIMESTAMP | NOT NULL | Scheduled event date/time |
| `created_at` | TIMESTAMP | NOT NULL | Record creation time |
| `updated_at` | TIMESTAMP | NOT NULL | Record update time |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

### 4. Event Invitees Table (`event_invitees`)

**Purpose**: Junction table managing event invitations and responses.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique invitation identifier |
| `event_id` | UUID | NOT NULL, FK → events.id | Associated event |
| `user_id` | UUID | NOT NULL, FK → users.id | Invited user |
| `status` | ENUM | NULL | Invitation status |
| `created_at` | TIMESTAMP | NOT NULL | Invitation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Status update timestamp |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

### 5. Event Join Requests Table (`event_join_requests`)

**Purpose**: Manages user requests to join events.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique request identifier |
| `event_id` | UUID | NOT NULL, FK → events.id | Target event |
| `user_id` | UUID | NOT NULL, FK → users.id | Requesting user |
| `creator_id` | UUID | NOT NULL, FK → users.id | Event creator |
| `status` | ENUM | DEFAULT 'PENDING' | Request status |
| `created_at` | TIMESTAMP | NOT NULL | Request timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Status update timestamp |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

**Enum Values for `status`:**
- `PENDING` - Request awaiting approval
- `ACCEPTED` - Request approved
- `REJECTED` - Request denied

### 6. Notifications Table (`notifications`)

**Purpose**: System-wide notification management for users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique notification identifier |
| `title` | VARCHAR(255) | NOT NULL | Notification title |
| `description` | VARCHAR(10000) | NULL | Notification content |
| `type` | VARCHAR(255) | NULL | Notification type/category |
| `ref_type` | VARCHAR(255) | NULL | Reference entity type |
| `ref_data` | JSONB | NULL | Reference data payload |
| `url` | VARCHAR(255) | NULL | Associated URL/link |
| `sender_id` | UUID | NULL, FK → users.id | Notification sender |
| `receiver_id` | UUID | NOT NULL, FK → users.id | Notification recipient |
| `has_read` | BOOLEAN | DEFAULT false | Read status |
| `created_at` | TIMESTAMP | NOT NULL | Notification timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Update timestamp |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

**Indexes:**
- Index on `title`
- Index on `type`
- Index on `ref_type`
- Index on `sender_id`
- Index on `receiver_id`
- `combined_notification_index` on multiple fields

### 7. Configs Table (`configs`)

**Purpose**: Application configuration management with type safety.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique config identifier |
| `key` | VARCHAR(255) | NOT NULL | Configuration key |
| `value` | TEXT | NOT NULL | Configuration value |
| `data_type` | ENUM | NOT NULL | Value data type |
| `type` | ENUM | DEFAULT 'PRIVATE' | Config visibility |
| `is_active` | BOOLEAN | DEFAULT true | Active status |
| `created_by` | UUID | NULL, FK → admin_users.id | Creator admin |
| `updated_by` | UUID | NULL, FK → admin_users.id | Last updater admin |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Update timestamp |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

**Indexes:**
- Index on `key`
- Index on `type`
- Index on `created_by`

### 8. Roles Table (`roles`)

**Purpose**: Role-based access control definitions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique role identifier |
| `name` | VARCHAR(255) | NOT NULL | Role display name |
| `slug` | VARCHAR(255) | NOT NULL | Role identifier slug |
| `is_active` | BOOLEAN | DEFAULT true | Active status |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Update timestamp |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

### 9. User Preferences Table (`user_preferences`)

**Purpose**: User-specific application preferences and settings.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique preference identifier |
| `user_id` | UUID | NOT NULL, FK → users.id | Associated user |
| `user_type` | ENUM | DEFAULT 'USER' | User type classification |
| `type` | ENUM | DEFAULT 'NOTIFICATION' | Preference category |
| `value` | JSONB[] | NULL | Preference values array |
| `created_at` | TIMESTAMP | NOT NULL | Creation timestamp |
| `updated_at` | TIMESTAMP | NOT NULL | Update timestamp |
| `deleted_at` | TIMESTAMP | NULL | Soft delete timestamp |

### 10. Additional Tables

#### Access Tokens Table (`access_tokens`)
- JWT token management and blacklisting
- Session tracking and security

#### Delete User OTP Table (`delete_user_otp`)
- Temporary OTP storage for account deletion
- Security verification for sensitive operations

#### Import/Export Jobs Table (`import_export_jobs`)
- Background job tracking for data operations
- Status and result management

#### Languages Table (`languages`)
- Internationalization support
- Multi-language content management

#### Role Permissions Table (`role_permissions`)
- Fine-grained permission mapping
- Role-permission relationships

#### UI Labels Table (`ui_labels`)
- Dynamic UI content management
- Multi-language label support

## Entity Relationships

### Primary Relationships

1. **Users ↔ Events**: One-to-Many
   - Users can create multiple events
   - Each event belongs to one user

2. **Events ↔ Event Invitees**: One-to-Many
   - Each event can have multiple invitees
   - Each invitation belongs to one event

3. **Users ↔ Event Invitees**: One-to-Many
   - Users can be invited to multiple events
   - Each invitation is for one user

4. **Events ↔ Event Join Requests**: One-to-Many
   - Events can have multiple join requests
   - Each request is for one event

5. **Users ↔ Notifications**: One-to-Many
   - Users can receive multiple notifications
   - Each notification has one recipient

6. **Admin Users ↔ Configs**: One-to-Many
   - Admins can manage multiple configs
   - Each config is managed by one admin

7. **Users ↔ User Preferences**: One-to-Many
   - Users can have multiple preferences
   - Each preference belongs to one user

### Cascade Behaviors

- **Soft Deletes**: All major tables use paranoid deletes (`deleted_at`)
- **Foreign Key Constraints**: Maintain referential integrity
- **Cascade Updates**: Automatic updates for related records

## Indexes and Performance

### Optimization Strategy

1. **Primary Keys**: All tables use UUID primary keys
2. **Unique Constraints**: Email uniqueness across user tables
3. **Composite Indexes**: Multi-column indexes for common queries
4. **JSONB Indexes**: Performance optimization for JSON queries

### Query Performance

- **Pagination**: Built-in skip/limit support
- **Filtering**: Indexed fields for common filters
- **Sorting**: Optimized for common sort patterns
- **Search**: Text search capabilities with indexing

## Data Types and Enums

### Authentication Service Enum
```typescript
enum AuthServiceEnum {
  EMAIL_PASSWORD = 'EMAIL_PASSWORD',
  FIREBASE = 'FIREBASE'
}
```

### Config Data Type Enum
```typescript
enum ConfigDataType {
  STRING = 'STRING',
  NUMBER = 'NUMBER',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON'
}
```

### Config Type Enum
```typescript
enum ConfigType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE'
}
```

### User Type Enum
```typescript
enum UserTypeEnum {
  USER = 'USER',
  ADMIN = 'ADMIN'
}
```

### Event Join Request Status Enum
```typescript
enum EventJoinRequestStatus {
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED'
}
```

### Invitee Status Enum
```typescript
enum InviteeStatus {
  JOIN = 'JOIN',
  PENDING = 'PENDING',
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
  INVITED = 'INVITED',
  OWNER = 'OWNER'
}
```

## Database Features

### Security Features

1. **Password Hashing**: bcrypt with configurable rounds
2. **Token Management**: JWT with refresh token rotation
3. **OTP Security**: Time-limited OTP with attempt limits
4. **Paranoid Deletes**: Soft delete for data recovery

### Data Integrity

1. **Foreign Key Constraints**: Referential integrity
2. **Check Constraints**: Data validation at DB level
3. **Unique Constraints**: Prevent duplicate records
4. **Not Null Constraints**: Required field enforcement

### Performance Features

1. **Connection Pooling**: Optimized connection management
2. **Query Optimization**: Indexed frequently accessed fields
3. **JSONB Support**: Efficient JSON operations
4. **Prepared Statements**: SQL injection prevention

### Backup and Recovery

1. **Migration System**: Version-controlled schema changes
2. **Soft Deletes**: Data recovery capabilities
3. **Audit Trail**: Created/updated timestamps
4. **Data Export**: Built-in export functionality

## Migration Management

### Sequelize Migrations

```bash
# Generate migration
npm run db:migrate

# Migration file structure
src/schema/main-server/migrations/scripts/
```

### Migration Examples

1. **Add Timezone Field**: `20250624102247-add-timezone-field-in-user.js`
2. **Add Mobile Fields**: `20250625035938-add-mobile_no-and-is_mobile_verified-field-in-user.js`

### Best Practices

1. **Incremental Changes**: Small, focused migrations
2. **Rollback Support**: Reversible migration scripts
3. **Data Validation**: Verify data integrity after migrations
4. **Backup Strategy**: Database backup before major migrations

## Database Diagram

The complete database schema is visualized in the accompanying `DB_DIAGRAM.drawio` file, which can be opened in draw.io or diagrams.net for interactive viewing and editing.

### Key Relationships Visualized

- User management and authentication flow
- Event creation and invitation system
- Notification delivery system
- Configuration management hierarchy
- Role and permission structure

This schema provides a robust foundation for a multi-user application with comprehensive user management, event coordination, and system configuration capabilities.