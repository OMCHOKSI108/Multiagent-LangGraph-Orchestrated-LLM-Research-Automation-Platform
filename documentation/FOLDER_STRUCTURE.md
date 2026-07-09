# Folder Structure Documentation

## Project Root Structure

```
server-boilerplate-typescript/
├── 📂 build/                      # Compiled JavaScript output (generated)
├── 📂 docker/                     # Docker configuration files
├── 📂 node_modules/               # Dependencies (generated)
├── 📂 src/                        # Source code (main application)
├── 📄 .env                        # Environment variables (local)
├── 📄 .env.dev                    # Development environment variables
├── 📄 .env.sample                 # Environment variables template
├── 📄 .gitignore                  # Git ignore rules
├── 📄 .gitlab-ci.yml              # GitLab CI/CD configuration
├── 📄 docker-compose.dev.yml      # Docker Compose for development
├── 📄 Dockerfile                  # Docker container definition
├── 📄 eslint.config.mjs           # ESLint configuration
├── 📄 nodemon.json                # Nodemon configuration
├── 📄 package.json                # NPM package configuration
├── 📄 package-lock.json           # NPM dependency lock file
├── 📄 README.md                   # Project documentation
├── 📄 sonar-project.properties    # SonarQube configuration
└── 📄 tsconfig.json               # TypeScript configuration
```

## Source Code Structure (`src/`)

```
src/
├── 📂 boot/                       # Application bootstrap and initialization
│   ├── 📂 data/                  # Bootstrap data and seed information
│   │   ├── 📄 create-admin-user-data.ts      # Default admin user data
│   │   ├── 📄 create-config-data.ts          # Default configuration data
│   │   ├── 📄 create-role-permission-data.ts # Default role permissions
│   │   ├── 📄 create-roles.ts               # Default roles data
│   │   └── 📄 language-data.ts              # Language/locale data
│   ├── 📄 boot-logger.ts          # Bootstrap process logging
│   ├── 📄 create-admin-users.ts   # Admin user initialization
│   ├── 📄 create-configs.ts       # Configuration initialization
│   ├── 📄 create-language-data.ts # Language data setup
│   ├── 📄 create-role-data.ts     # Role data initialization
│   ├── 📄 create-role-permission-data.ts # Permission setup
│   └── 📄 index.ts               # Main bootstrap orchestrator
├── 📂 config/                     # Application configuration management
│   └── 📄 config.ts              # Centralized configuration loader
├── 📂 constants/                  # Application-wide constants
│   ├── 📄 api-constants.ts       # API endpoint constants
│   ├── 📄 error-type.ts          # Error type constants
│   ├── 📄 language-constants.ts  # Language/i18n constants
│   └── 📄 service-constants.ts   # Service configuration constants
├── 📂 directives/                 # GraphQL custom directives
│   ├── 📄 auth-directive.ts      # @isAuthenticated directive
│   ├── 📄 has-permission.ts      # @hasPermission directive
│   ├── 📄 has-role-directive.ts  # @hasRole directive
│   ├── 📄 rate-limit-directive.ts # @rateLimit directive
│   └── 📄 index.ts              # Directive aggregator and exports
├── 📂 enums/                     # TypeScript enum definitions
│   ├── 📄 api.ts                # API-related enumerations
│   ├── 📄 error-type.ts         # Error classification enums
│   ├── 📄 language.ts           # Language and locale enums
│   └── 📄 service.ts            # Service type enumerations
├── 📂 functions/                 # Utility functions library
│   └── 📄 common.ts             # General-purpose utility functions
├── 📂 lib/                      # External library integrations and wrappers
├── 📂 logger/                   # Logging configuration and utilities
│   └── 📄 logger.ts            # Winston logger configuration
├── 📂 modules/                  # Business logic modules (main application logic)
│   ├── 📂 common/              # Shared/common functionality
│   │   ├── 📄 common-logger.ts               # Common operations logging
│   │   ├── 📂 resolvers/                     # Common GraphQL resolvers
│   │   │   ├── 📂 mutation/                  # Common mutations
│   │   │   ├── 📂 queries/                   # Common queries
│   │   │   │   └── 📄 dynamic-message.ts     # Dynamic message query
│   │   │   └── 📄 common.resolvers.ts        # Common resolver exports
│   │   ├── 📄 common.graphql                 # Common GraphQL schema
│   │   └── 📄 common.admin.graphql           # Admin-specific common schema
│   ├── 📂 config/              # Configuration management module
│   │   ├── 📄 config-logger.ts               # Config operations logging
│   │   ├── 📂 resolvers/                     # Config GraphQL resolvers
│   │   │   ├── 📂 mutations/                 # Config mutation operations
│   │   │   │   ├── 📄 create-config.ts       # Create configuration
│   │   │   │   ├── 📄 update-config.ts       # Update configuration
│   │   │   │   └── 📄 delete-config.ts       # Delete configuration
│   │   │   ├── 📂 queries/                   # Config query operations
│   │   │   │   ├── 📄 config.ts              # Single config query
│   │   │   │   ├── 📄 configs.ts             # Multiple configs query
│   │   │   │   └── 📄 public-configs.ts      # Public configs query
│   │   │   └── 📄 config.resolvers.ts        # Config resolver exports
│   │   ├── 📂 services/                      # Config business logic
│   │   │   ├── 📄 config-service.ts          # Single config operations
│   │   │   ├── 📄 configs-service.ts         # Multiple configs operations
│   │   │   ├── 📄 create-config-service.ts   # Config creation service
│   │   │   ├── 📄 update-config-service.ts   # Config update service
│   │   │   ├── 📄 delete-config-service.ts   # Config deletion service
│   │   │   └── 📄 public-configs-service.ts  # Public configs service
│   │   ├── 📄 config.graphql                 # Config GraphQL schema
│   │   └── 📄 index.ts                       # Config module exports
│   ├── 📂 event/               # Event management module
│   │   ├── 📂 resolvers/                     # Event GraphQL resolvers
│   │   │   ├── 📂 field-resolvers/           # Event field resolvers
│   │   │   ├── 📂 mutations/                 # Event mutation operations
│   │   │   │   ├── 📄 create-event.ts        # Create event
│   │   │   │   ├── 📄 update-event.ts        # Update event
│   │   │   │   ├── 📄 delete-event.ts        # Delete event
│   │   │   │   ├── 📄 create-event-join-request.ts # Join request
│   │   │   │   ├── 📄 update-event-join-request.ts # Update join request
│   │   │   │   └── 📄 send-event-invitation.ts     # Send invitation
│   │   │   └── 📂 queries/                   # Event query operations
│   │   │       ├── 📄 event.ts               # Single event query
│   │   │       └── 📄 events.ts              # Multiple events query
│   │   ├── 📂 services/                      # Event business logic
│   │   │   ├── 📄 create-event-service.ts    # Event creation service
│   │   │   ├── 📄 update-event-service.ts    # Event update service
│   │   │   ├── 📄 delete-event-service.ts    # Event deletion service
│   │   │   ├── 📄 get-event-service.ts       # Single event retrieval
│   │   │   ├── 📄 get-events-service.ts      # Multiple events retrieval
│   │   │   └── 📄 event-join-service.ts      # Join request handling
│   │   └── 📄 event.graphql                  # Event GraphQL schema
│   ├── 📂 notification/        # Notification management module
│   │   ├── 📂 resolvers/                     # Notification GraphQL resolvers
│   │   │   ├── 📂 mutations/                 # Notification mutations
│   │   │   └── 📂 queries/                   # Notification queries
│   │   ├── 📂 services/                      # Notification business logic
│   │   └── 📄 notification.common.graphql    # Notification GraphQL schema
│   ├── 📂 role/                # Role management module
│   │   ├── 📂 resolvers/                     # Role GraphQL resolvers
│   │   │   ├── 📂 mutations/                 # Role mutation operations
│   │   │   │   ├── 📄 create-role.ts         # Create role
│   │   │   │   ├── 📄 update-role.ts         # Update role
│   │   │   │   └── 📄 delete-role.ts         # Delete role
│   │   │   ├── 📂 queries/                   # Role query operations
│   │   │   │   ├── 📄 role.ts                # Single role query
│   │   │   │   └── 📄 roles.ts               # Multiple roles query
│   │   │   └── 📄 role.admin.resolvers.ts    # Role admin resolvers
│   │   ├── 📂 services/                      # Role business logic services
│   │   │   ├── 📄 create-role-service.ts     # Role creation service
│   │   │   ├── 📄 update-role-service.ts     # Role update service
│   │   │   ├── 📄 delete-role-service.ts     # Role deletion service
│   │   │   ├── 📄 role-service.ts            # Single role operations
│   │   │   └── 📄 roles-service.ts           # Multiple roles operations
│   │   ├── 📄 role-logger.ts                 # Role operations logging
│   │   └── 📄 role.admin.graphql             # Role admin GraphQL schema
│   ├── 📂 role-permission/     # Permission management module
│   │   ├── 📂 resolvers/                     # Permission GraphQL resolvers
│   │   │   └── 📂 queries/                   # Permission queries
│   │   │       └── 📄 role-permissions.ts    # Role permissions query
│   │   └── 📄 role-permission.admin.graphql  # Permission GraphQL schema
│   ├── 📂 ui-label/           # UI label management module
│   │   ├── 📂 resolvers/                     # UI label GraphQL resolvers
│   │   │   ├── 📂 mutations/                 # UI label mutations
│   │   │   │   ├── 📄 create-ui-label.ts     # Create UI label
│   │   │   │   ├── 📄 update-ui-label.ts     # Update UI label
│   │   │   │   └── 📄 delete-ui-label.ts     # Delete UI label
│   │   │   ├── 📂 queries/                   # UI label queries
│   │   │   │   ├── 📄 ui-label.ts            # Single UI label query
│   │   │   │   └── 📄 ui-labels.ts           # Multiple UI labels query
│   │   │   ├── 📄 ui-label.admin.resolvers.ts    # Admin resolvers
│   │   │   └── 📄 ui-label.common.resolvers.ts   # Common resolvers
│   │   ├── 📂 services/                      # UI label business logic
│   │   │   ├── 📄 create-ui-label-service.ts # UI label creation
│   │   │   ├── 📄 update-ui-label-service.ts # UI label update
│   │   │   ├── 📄 delete-ui-label-service.ts # UI label deletion
│   │   │   ├── 📄 ui-label-service.ts        # Single UI label operations
│   │   │   ├── 📄 ui-labels-service.ts       # Multiple UI labels operations
│   │   │   └── 📄 update-ui-labels-file-content.ts # File content update
│   │   ├── 📄 ui-label-logger.ts             # UI label logging
│   │   └── 📄 ui-label.admin.graphql         # UI label GraphQL schema
│   ├── 📂 user/               # User management module (largest module)
│   │   ├── 📂 field-resolvers/               # User field resolvers
│   │   │   ├── 📄 export-job-url.ts          # Export job URL resolver
│   │   │   ├── 📄 import-job-result-url.ts   # Import job result URL
│   │   │   ├── 📄 user-profile-image.ts      # Profile image resolver
│   │   │   └── 📄 user-un-read-notification-count.ts # Notification count
│   │   ├── 📂 function/                      # User utility functions
│   │   │   └── 📄 user-filter-helper.ts      # User filtering utilities
│   │   ├── 📂 resolvers/                     # User GraphQL resolvers
│   │   │   ├── 📂 mutations/                 # User mutation operations
│   │   │   │   ├── 📄 bulk-delete-admin-user-admin.ts    # Bulk delete admin
│   │   │   │   ├── 📄 bulk-delete-user-admin.ts          # Bulk delete users
│   │   │   │   ├── 📄 bulk-update-admin-user-admin.ts    # Bulk update admin
│   │   │   │   ├── 📄 bulk-update-user-admin.ts          # Bulk update users
│   │   │   │   ├── 📄 change-password.ts                 # Change password
│   │   │   │   ├── 📄 change-password-admin.ts           # Admin change password
│   │   │   │   ├── 📄 create-admin-user-admin.ts         # Create admin user
│   │   │   │   ├── 📄 create-user-admin.ts               # Create user (admin)
│   │   │   │   ├── 📄 create-import-job-admin.ts         # Import job creation
│   │   │   │   ├── 📄 delete-user.ts                     # Delete user
│   │   │   │   ├── 📄 delete-user-admin.ts               # Delete user (admin)
│   │   │   │   ├── 📄 disable-admin-user.ts              # Disable admin user
│   │   │   │   ├── 📄 disable-admin-user-admin.ts        # Disable admin (admin)
│   │   │   │   ├── 📄 disable-user.ts                    # Disable user
│   │   │   │   ├── 📄 email-otp-verification.ts          # Email OTP verification
│   │   │   │   ├── 📄 email-verification.ts              # Email verification
│   │   │   │   ├── 📄 email-verification-admin.ts        # Admin email verification
│   │   │   │   ├── 📄 firebase-login.ts                  # Firebase authentication
│   │   │   │   ├── 📄 forgot-password.ts                 # Password reset request
│   │   │   │   ├── 📄 forgot-password-admin.ts           # Admin password reset
│   │   │   │   ├── 📄 login-admin-user.ts                # Admin user login
│   │   │   │   ├── 📄 login-user.ts                      # User login
│   │   │   │   ├── 📄 logout-admin-user.ts               # Admin user logout
│   │   │   │   ├── 📄 logout-user.ts                     # User logout
│   │   │   │   ├── 📄 mobile-otp-verification.ts         # Mobile OTP verification
│   │   │   │   ├── 📄 refresh-admin-token.ts             # Admin token refresh
│   │   │   │   ├── 📄 refresh-token.ts                   # Token refresh
│   │   │   │   ├── 📄 request-export-data.ts             # Data export request
│   │   │   │   ├── 📄 resend-otp-verification-email.ts   # Resend OTP email
│   │   │   │   ├── 📄 resend-verification-email.ts       # Resend verification
│   │   │   │   ├── 📄 resend-verification-email-admin.ts # Admin resend verification
│   │   │   │   ├── 📄 send-delete-user-otp.ts            # Delete user OTP
│   │   │   │   ├── 📄 send-delete-user-admin-otp.ts      # Admin delete user OTP
│   │   │   │   ├── 📄 send-mobile-verify-otp.ts          # Mobile verification OTP
│   │   │   │   ├── 📄 sign-up.ts                         # User registration
│   │   │   │   ├── 📄 update-admin-profile.ts            # Update admin profile
│   │   │   │   ├── 📄 update-admin-user-admin.ts         # Update admin user
│   │   │   │   ├── 📄 update-password.ts                 # Update password
│   │   │   │   ├── 📄 update-password-admin.ts           # Admin update password
│   │   │   │   ├── 📄 update-profile.ts                  # Update user profile
│   │   │   │   ├── 📄 update-user.ts                     # Update user
│   │   │   │   ├── 📄 update-user-admin.ts               # Update user (admin)
│   │   │   │   ├── 📄 upsert-user-admin-preference.ts    # Admin preferences
│   │   │   │   ├── 📄 upsert-user-preference.ts          # User preferences
│   │   │   │   ├── 📄 verify-delete-user-otp.ts          # Verify delete OTP
│   │   │   │   ├── 📄 verify-delete-user-admin-otp.ts    # Verify admin delete OTP
│   │   │   │   ├── 📄 verify-reset-token.ts              # Verify reset token
│   │   │   │   ├── 📄 verify-reset-token-admin.ts        # Admin verify reset token
│   │   │   │   ├── 📄 verify-email-verification-token.ts # Verify email token
│   │   │   │   └── 📄 verify-email-verification-token-admin.ts # Admin verify email
│   │   │   ├── 📂 queries/                   # User query operations
│   │   │   │   ├── 📄 admin.ts                           # Single admin query
│   │   │   │   ├── 📄 admins.ts                          # Multiple admins query
│   │   │   │   ├── 📄 get-import-users-upload-signed-url-admin.ts # Import URL
│   │   │   │   ├── 📄 get-job-data-admin.ts              # Job data query
│   │   │   │   ├── 📄 get-profile-image-upload-signed-url.ts # Profile image URL
│   │   │   │   ├── 📄 me.ts                              # Current user query
│   │   │   │   ├── 📄 user.ts                            # Single user query
│   │   │   │   ├── 📄 user-admin-preference.ts           # Admin preferences query
│   │   │   │   ├── 📄 user-kpi-data-admin.ts             # User KPI data
│   │   │   │   ├── 📄 user-preference.ts                 # User preferences query
│   │   │   │   └── 📄 users.ts                           # Multiple users query
│   │   │   ├── 📄 user.admin.resolvers.ts                # Admin user resolvers
│   │   │   └── 📄 user.common.resolvers.ts               # Common user resolvers
│   │   ├── 📂 services/                      # User business logic services
│   │   │   ├── 📄 bulk-delete-service.ts                 # Bulk delete operations
│   │   │   ├── 📄 bulk-update-service.ts                 # Bulk update operations
│   │   │   ├── 📄 change-password-service.ts             # Password change service
│   │   │   ├── 📄 delete-user-service.ts                 # User deletion service
│   │   │   ├── 📄 disable-admin-user-service.ts          # Admin disable service
│   │   │   ├── 📄 disable-user-service.ts                # User disable service
│   │   │   ├── 📄 email-otp-verification-service.ts      # Email OTP service
│   │   │   ├── 📄 email-verification-service.ts          # Email verification service
│   │   │   ├── 📄 firebase-login-service.ts              # Firebase auth service
│   │   │   ├── 📄 forgot-password-service.ts             # Password reset service
│   │   │   ├── 📄 get-user-preference-service.ts         # User preferences service
│   │   │   ├── 📄 get-user-service.ts                    # Single user service
│   │   │   ├── 📄 get-users-list-service.ts              # Users list service
│   │   │   ├── 📄 login-user-service.ts                  # User login service
│   │   │   ├── 📄 logout-user-service.ts                 # User logout service
│   │   │   ├── 📄 mobile-otp-verification-service.ts     # Mobile OTP service
│   │   │   ├── 📄 process-export-request.ts              # Data export processing
│   │   │   ├── 📄 refresh-token-service.ts               # Token refresh service
│   │   │   ├── 📄 send-delete-user-otp-service.ts        # Delete OTP service
│   │   │   ├── 📄 send-mobile-verify-otp-service.ts      # Mobile OTP service
│   │   │   ├── 📄 sign-up-service.ts                     # User registration service
│   │   │   ├── 📄 update-password-service.ts             # Password update service
│   │   │   ├── 📄 update-profile-service.ts              # Profile update service
│   │   │   ├── 📄 update-user-admin-service.ts           # Admin user update service
│   │   │   ├── 📄 update-user-service.ts                 # User update service
│   │   │   ├── 📄 upsert-user-preference-service.ts      # Preferences service
│   │   │   ├── 📄 user-kpi-data-service.ts               # KPI data service
│   │   │   ├── 📄 verify-delete-user-otp-service.ts      # Delete OTP verification
│   │   │   └── 📄 verify-reset-token-service.ts          # Reset token verification
│   │   ├── 📄 user-logger.ts                 # User operations logging
│   │   ├── 📄 user.admin.graphql             # Admin user GraphQL schema
│   │   └── 📄 user.common.graphql            # Common user GraphQL schema
│   └── 📄 index.ts                          # Modules aggregator and exports
├── 📂 providers/                  # External service provider integrations
│   ├── 📄 auth.ts                # Authentication providers
│   ├── 📄 email.ts               # Email service providers
│   ├── 📄 index.ts              # Providers aggregator
│   ├── 📄 sms.ts                # SMS service providers
│   └── 📄 storage.ts            # Storage service providers
├── 📂 pubsub/                    # Pub/Sub messaging system
│   └── 📄 index.ts              # Pub/Sub configuration
├── 📂 rest/                      # REST API implementation
│   ├── 📂 middlewares/                       # Express.js middlewares
│   │   ├── 📄 error-handler.ts               # Global error handling
│   │   ├── 📄 express-validators.ts          # Request validation rules
│   │   ├── 📄 is-authenticated.ts            # Authentication middleware
│   │   ├── 📄 rate-limit.ts                  # Rate limiting middleware
│   │   ├── 📄 set-locale-service-in-req.ts   # Locale service injection
│   │   ├── 📄 set-log-info-in-req.ts         # Logging info injection
│   │   ├── 📄 throw-validation-error.ts      # Validation error handler
│   │   └── 📄 validate-time-stamp.ts         # Timestamp validation
│   ├── 📂 modules/                           # REST-specific modules
│   │   ├── 📂 auth/                          # Authentication REST endpoints
│   │   │   └── 📂 v1/                        # Version 1 auth endpoints
│   │   │       ├── 📄 auth-logger.ts         # Auth logging
│   │   │       └── 📄 routes.ts              # Auth route definitions
│   │   └── 📂 user/                          # User REST endpoints
│   │       └── 📂 v1/                        # Version 1 user endpoints
│   │           ├── 📂 controllers/           # REST controllers
│   │           │   ├── 📄 admin-user.ts      # Admin user controller
│   │           │   ├── 📄 admin-users.ts     # Admin users controller
│   │           │   ├── 📄 bulk-delete-admin.ts # Bulk delete admin controller
│   │           │   ├── 📄 bulk-delete-user.ts  # Bulk delete user controller
│   │           │   ├── 📄 bulk-update-admin.ts # Bulk update admin controller
│   │           │   ├── 📄 bulk-update-user.ts  # Bulk update user controller
│   │           │   ├── 📄 create-admin-user-admin.ts # Create admin controller
│   │           │   ├── 📄 create-user-admin.ts       # Create user controller
│   │           │   ├── 📄 user.ts                    # User controller
│   │           │   └── 📄 users.ts                   # Users controller
│   │           ├── 📂 services/               # REST-specific services
│   │           │   ├── 📄 bulk-delete-service.ts     # Bulk delete service
│   │           │   ├── 📄 bulk-update-service.ts     # Bulk update service
│   │           │   ├── 📄 create-admin-user-admin-service.ts # Create admin service
│   │           │   ├── 📄 create-user-admin-service.ts       # Create user service
│   │           │   ├── 📄 get-user-service.ts               # Get user service
│   │           │   └── 📄 get-users-service.ts              # Get users service
│   │           ├── 📄 routes.ts               # User REST routes
│   │           └── 📄 user-logger.ts          # User REST logging
│   └── 📂 routes/                            # REST route aggregators
│       ├── 📄 index.ts                       # Main routes aggregator
│       └── 📄 v1.ts                          # Version 1 routes
├── 📂 scalars/                   # GraphQL custom scalar types
│   └── 📄 limit-scalar.ts        # Limit scalar for pagination
├── 📂 schema/                    # Database schema and configurations
│   ├── 📂 elastic-search/                    # Elasticsearch schema
│   └── 📂 main-server/                       # Main database schema
│       ├── 📂 enums/                         # Database enumerations
│       │   └── 📄 db-enums.ts                # Database enum definitions
│       ├── 📂 migrations/                    # Database migrations
│       │   ├── 📄 config.js                  # Migration configuration
│       │   └── 📂 scripts/                   # Migration scripts
│       │       ├── 📄 20250624102247-add-timezone-field-in-user.js
│       │       └── 📄 20250625035938-add-mobile_no-and-is_mobile_verified-field-in-user.js
│       └── 📂 models/                        # Database models
│           ├── 📄 access-token.model.ts      # Access tokens model
│           ├── 📄 admin-user.model.ts        # Admin users model
│           ├── 📄 config.model.ts            # Configurations model
│           ├── 📄 delete-user-otp.model.ts   # Delete user OTP model
│           ├── 📄 event.model.ts             # Events model
│           ├── 📄 event-invitee.model.ts     # Event invitees model
│           ├── 📄 event-join-request.model.ts # Event join requests model
│           ├── 📄 import-export-job.model.ts # Import/export jobs model
│           ├── 📄 language.model.ts          # Languages model
│           ├── 📄 notification.model.ts      # Notifications model
│           ├── 📄 role.model.ts              # Roles model
│           ├── 📄 role-permission.model.ts   # Role permissions model
│           ├── 📄 ui-label.model.ts          # UI labels model
│           ├── 📄 user.model.ts              # Users model
│           └── 📄 user-preference.model.ts   # User preferences model
├── 📂 shared-lib/                # Shared libraries and utilities
│   ├── 📂 aws/                               # AWS service integrations
│   │   └── 📂 functions/                     # AWS utility functions
│   ├── 📂 constants/                         # Shared constants
│   ├── 📂 elastic-search/                    # Elasticsearch utilities
│   │   ├── 📂 helper-functions/              # ES helper functions
│   │   └── 📄 boot.ts                        # ES initialization
│   ├── 📂 email/                             # Email service utilities
│   │   ├── 📂 delete-user-otp-mail/          # Delete user OTP templates
│   │   ├── 📂 forgot-password-mail/          # Password reset templates
│   │   └── 📂 verification-mail/             # Email verification templates
│   ├── 📂 error-handler/                     # Error handling utilities
│   ├── 📂 firebase/                          # Firebase integrations
│   ├── 📂 graphql/                           # GraphQL utilities
│   │   └── 📂 plugins/                       # GraphQL plugins
│   ├── 📂 hive-moderation/                   # Content moderation
│   ├── 📂 imgix/                             # Image processing
│   ├── 📂 logger/                            # Logging utilities
│   ├── 📂 msg91/                             # MSG91 SMS service
│   ├── 📂 providers/                         # External service providers
│   │   ├── 📂 auth/                          # Authentication providers
│   │   │   └── 📂 firebase/                  # Firebase auth provider
│   │   ├── 📂 email/                         # Email service providers
│   │   │   └── 📂 sendbay/                   # SendBay email provider
│   │   ├── 📂 sms/                           # SMS service providers
│   │   │   ├── 📂 msg91/                     # MSG91 SMS provider
│   │   │   └── 📂 twilio/                    # Twilio SMS provider
│   │   └── 📂 storage/                       # Storage service providers
│   │       └── 📂 s3/                        # AWS S3 storage provider
│   ├── 📂 pusher/                            # Pusher real-time messaging
│   ├── 📂 queue/                             # Queue processing
│   │   ├── 📂 import-export-job/             # Import/export job processing
│   │   └── 📂 send-mail/                     # Email queue processing
│   ├── 📂 queue-processor/                   # Queue processors
│   ├── 📂 twilio/                            # Twilio integrations
│   ├── 📂 types/                             # Shared type definitions
│   └── 📂 utils/                             # Shared utilities
├── 📂 types/                     # Application type definitions
├── 📂 utils/                     # Application-specific utilities
│   ├── 📂 auth/                              # Authentication utilities
│   │   ├── 📂 jwt/                           # JWT token utilities
│   │   └── 📄 password.ts                    # Password utilities
│   ├── 📂 intl/                              # Internationalization
│   │   ├── 📂 locales/                       # Locale files
│   │   ├── 📄 i18n-config.ts                 # i18n configuration
│   │   └── 📄 locale-service.ts              # Locale service
│   ├── 📂 rest/                              # REST-specific utilities
│   ├── 📄 cors-options.ts                    # CORS configuration
│   ├── 📄 introspection-restriction-middleware.ts # GraphQL introspection control
│   └── 📄 query-length-middleware.ts         # Query length validation
├── 📄 env-validator.ts           # Environment variable validation
├── 📄 logger.ts                  # Main logger configuration
├── 📄 redis-client.ts            # Redis client configuration
├── 📄 sentry.ts                  # Sentry error monitoring setup
├── 📄 sequelize-client.ts        # Sequelize ORM client
├── 📄 start-apollo-server.ts     # Apollo GraphQL server initialization
└── 📄 index.ts                   # Application entry point
```

## Folder Naming Conventions

### 1. Directory Naming
- **kebab-case**: All directories use kebab-case (lowercase with hyphens)
- **Descriptive Names**: Directory names clearly indicate their purpose
- **Hierarchical Structure**: Nested directories follow logical grouping

### 2. File Naming
- **kebab-case**: All files use kebab-case naming convention
- **Descriptive Extensions**: `.ts` for TypeScript, `.js` for JavaScript, `.graphql` for GraphQL schemas
- **Purpose-driven Names**: File names indicate their specific function

### 3. Module Organization
- **Functional Grouping**: Related functionality grouped together
- **Separation of Concerns**: Clear separation between different layers
- **Consistent Structure**: Each module follows the same organizational pattern

## Key Directory Explanations

### `/src/boot/`
**Purpose**: Application initialization and bootstrap processes
- Contains all startup logic and initial data seeding
- Handles creation of default admin users, roles, and configurations
- Orchestrates the application startup sequence

### `/src/modules/`
**Purpose**: Core business logic organized by domain
- Each subdirectory represents a distinct business domain
- Contains GraphQL resolvers, business services, and domain logic
- Follows consistent internal structure across all modules

### `/src/shared-lib/`
**Purpose**: Reusable libraries and external service integrations
- Contains utilities that can be shared across multiple modules
- Integrates with external services (AWS, Firebase, email providers, etc.)
- Provides common functionality like logging, error handling, and queues

### `/src/schema/main-server/`
**Purpose**: Database schema management
- Contains Sequelize models defining database structure
- Migration scripts for schema versioning
- Database enums and type definitions

### `/src/rest/`
**Purpose**: REST API implementation parallel to GraphQL
- Express.js-based REST endpoints
- Middleware for authentication, validation, and error handling
- Versioned API structure (v1, v2, etc.)

### `/src/utils/`
**Purpose**: Application-specific utilities
- Authentication helpers (JWT, password management)
- Internationalization and localization utilities
- CORS configuration and GraphQL middleware

## Configuration Files Location

### Root Configuration Files
```
📄 .env                    # Local environment variables
📄 .env.dev                # Development environment variables
📄 .env.sample             # Environment template
📄 eslint.config.mjs       # ESLint configuration
📄 tsconfig.json           # TypeScript configuration
📄 nodemon.json            # Nodemon configuration
📄 docker-compose.dev.yml  # Docker development configuration
📄 Dockerfile              # Docker container definition
```

### Application Configuration
```
src/config/config.ts       # Centralized configuration management
src/env-validator.ts        # Environment validation
```

## Build and Output Structure

### `/build/` Directory
**Purpose**: Compiled JavaScript output (generated by TypeScript compiler)
- Mirrors the `/src/` directory structure
- Contains transpiled JavaScript files
- Used for production deployment

### Build Process
```bash
npm run build              # Compiles TypeScript to JavaScript
npm run dev               # Development server with hot reload
npm start                 # Production server using compiled JavaScript
```

This folder structure provides a clear, scalable organization that separates concerns, promotes reusability, and maintains consistency across the entire application. The modular approach allows for easy maintenance, testing, and feature development while keeping related functionality grouped together.