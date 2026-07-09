# API Documentation

This document provides detailed information about the available GraphQL and REST APIs, including example requests, responses, and explanations for each key in the response objects.

---

## Table of Contents
1. [GraphQL API](#graphql-api)
   - [Config Management](#config-management)
   - [User Management](#user-management)
   - [Role Management](#role-management)
   - [Common](#common)
   - [Error Handling](#error-handling)
2. [REST API](#rest-api)
   - [Authentication](#authentication)
   - [File Upload](#file-upload)
   - [Error Handling](#rest-error-handling)

---

## GraphQL API

### Config Management

#### Get All Configs (Admin Only)
**Query:**
```graphql
query GetConfigs($filter: ConfigFilterInput, $sort: ConfigSortInput) {
  configs(filter: $filter, sort: $sort) {
    data {
      id
      key
      value
      dataType
      type
      createdAt
      updatedAt
    }
    count
  }
}
```
**Example Response:**
```json
{
  "data": {
    "configs": {
      "data": [
        {
          "id": "1",
          "key": "API_VERSION",
          "value": "v2",
          "dataType": "STRING",
          "type": "PUBLIC",
          "createdAt": "2024-06-27T10:00:00.000Z",
          "updatedAt": "2024-06-27T10:00:00.000Z"
        }
      ],
      "count": 1
    }
  }
}
```

#### Get Public Configs
**Query:**
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

#### Get Single Config
**Query:**
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

#### Create Config
**Mutation:**
```graphql
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
```
**Example Request:**
```json
{
  "data": {
    "key": "NEW_FEATURE",
    "value": "enabled",
    "dataType": "STRING",
    "type": "PUBLIC"
  }
}
```
**Example Response:**
```json
{
  "data": {
    "createConfig": {
      "data": {
        "id": "2",
        "key": "NEW_FEATURE",
        "value": "enabled",
        "dataType": "STRING",
        "type": "PUBLIC"
      },
      "message": "Config created successfully!"
    }
  }
}
```

#### Update Config
**Mutation:**
```graphql
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
```
**Example Request:**
```json
{
  "where": { "id": "2" },
  "data": { "value": "disabled" }
}
```
**Example Response:**
```json
{
  "data": {
    "updateConfig": {
      "data": {
        "id": "2",
        "key": "NEW_FEATURE",
        "value": "disabled",
        "dataType": "STRING",
        "type": "PUBLIC"
      },
      "message": "Config updated successfully!"
    }
  }
}
```

#### Delete Config
**Mutation:**
```graphql
mutation DeleteConfig($where: ConfigUniqueInput!) {
  deleteConfig(where: $where) {
    message
  }
}
```
**Example Request:**
```json
{
  "where": { "id": "2" }
}
```
**Example Response:**
```json
{
  "data": {
    "deleteConfig": {
      "message": "Config deleted successfully!"
    }
  }
}
```

---

### User Management

#### Get All Users (Admin Only)
**Query:**
```graphql
query GetUsers($filter: UserFilterInput, $sort: UsersSortInput) {
  users(filter: $filter, sort: $sort) {
    data {
      id
      email
      firstName
      lastName
      isActive
      roles
      createdAt
      updatedAt
    }
    count
  }
}
```
**Example Response:**
```json
{
  "data": {
    "users": {
      "data": [
        {
          "id": "123",
          "email": "user@example.com",
          "firstName": "John",
          "lastName": "Doe",
          "isActive": true,
          "roles": ["USER"],
          "createdAt": "2024-06-27T10:00:00.000Z",
          "updatedAt": "2024-06-27T10:00:00.000Z"
        }
      ],
      "count": 1
    }
  }
}
```

#### Get Single User
**Query:**
```graphql
query GetUser($where: UserWhereUniqueInput!) {
  user(where: $where) {
    id
    email
    firstName
    lastName
    isActive
    roles
    createdAt
    updatedAt
  }
}
```
**Example Response:**
```json
{
  "data": {
    "user": {
      "id": "123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "isActive": true,
      "roles": ["USER"],
      "createdAt": "2024-06-27T10:00:00.000Z",
      "updatedAt": "2024-06-27T10:00:00.000Z"
    }
  }
}
```

#### Sign Up
**Mutation:**
```graphql
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
```
**Example Request:**
```json
{
  "data": {
    "email": "newuser@example.com",
    "password": "password123",
    "firstName": "Jane",
    "lastName": "Smith"
  }
}
```
**Example Response:**
```json
{
  "data": {
    "signUp": {
      "message": "User registered successfully!",
      "user": {
        "id": "124",
        "email": "newuser@example.com",
        "firstName": "Jane",
        "lastName": "Smith"
      }
    }
  }
}
```

#### Login User
**Mutation:**
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

#### Get Current User
**Query:**
```graphql
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
**Example Response:**
```json
{
  "data": {
    "me": {
      "id": "123",
      "email": "user@example.com",
      "firstName": "John",
      "lastName": "Doe",
      "profileImage": "https://.../avatar.png",
      "isActive": true
    }
  }
}
```

#### Update User
**Mutation:**
```graphql
mutation UpdateUser($where: UserWhereUniqueInput!, $data: UpdateUserInput!) {
  updateUser(where: $where, data: $data) {
    message
    data {
      id
      email
      firstName
      lastName
      isActive
    }
  }
}
```
**Example Request:**
```json
{
  "where": { "id": "123" },
  "data": { "firstName": "Johnny" }
}
```
**Example Response:**
```json
{
  "data": {
    "updateUser": {
      "message": "User updated successfully!",
      "data": {
        "id": "123",
        "email": "user@example.com",
        "firstName": "Johnny",
        "lastName": "Doe",
        "isActive": true
      }
    }
  }
}
```

#### Delete User
**Mutation:**
```graphql
mutation DeleteUser($where: UserWhereUniqueInput!) {
  deleteUser(where: $where) {
    message
  }
}
```
**Example Request:**
```json
{
  "where": { "id": "123" }
}
```
**Example Response:**
```json
{
  "data": {
    "deleteUser": {
      "message": "User deleted successfully!"
    }
  }
}
```

---

### Role Management

#### Get All Roles
**Query:**
```graphql
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
**Example Response:**
```json
{
  "data": {
    "roles": {
      "data": [
        {
          "id": "1",
          "name": "ADMIN",
          "description": "Administrator role",
          "key": "ADMIN",
          "permissions": [
            { "key": "config", "level": "EDIT" }
          ]
        }
      ],
      "count": 1
    }
  }
}
```

#### Get Single Role
**Query:**
```graphql
query GetRole($where: RoleUniqueInput!) {
  role(where: $where) {
    id
    name
    description
    key
    permissions
    createdAt
    updatedAt
  }
}
```
**Example Response:**
```json
{
  "data": {
    "role": {
      "id": "1",
      "name": "ADMIN",
      "description": "Administrator role",
      "key": "ADMIN",
      "permissions": [
        { "key": "config", "level": "EDIT" }
      ],
      "createdAt": "2024-06-27T10:00:00.000Z",
      "updatedAt": "2024-06-27T10:00:00.000Z"
    }
  }
}
```

#### Create Role
**Mutation:**
```graphql
mutation CreateRole($data: CreateRoleInput!) {
  createRole(data: $data) {
    data {
      id
      name
      description
      key
      permissions
    }
    message
  }
}
```
**Example Request:**
```json
{
  "data": {
    "name": "MANAGER",
    "description": "Manager role",
    "permissions": [
      { "key": "user", "level": "VIEW" }
    ]
  }
}
```
**Example Response:**
```json
{
  "data": {
    "createRole": {
      "data": {
        "id": "2",
        "name": "MANAGER",
        "description": "Manager role",
        "key": "MANAGER",
        "permissions": [
          { "key": "user", "level": "VIEW" }
        ]
      },
      "message": "Role created successfully!"
    }
  }
}
```

#### Update Role
**Mutation:**
```graphql
mutation UpdateRole($where: RoleUniqueInput!, $data: UpdateRoleInput!) {
  updateRole(where: $where, data: $data) {
    data {
      id
      name
      description
      key
      permissions
    }
    message
  }
}
```
**Example Request:**
```json
{
  "where": { "id": "2" },
  "data": { "description": "Updated manager role" }
}
```
**Example Response:**
```json
{
  "data": {
    "updateRole": {
      "data": {
        "id": "2",
        "name": "MANAGER",
        "description": "Updated manager role",
        "key": "MANAGER",
        "permissions": [
          { "key": "user", "level": "VIEW" }
        ]
      },
      "message": "Role updated successfully!"
    }
  }
}
```

#### Delete Role
**Mutation:**
```graphql
mutation DeleteRole($where: RoleUniqueInput!) {
  deleteRole(where: $where) {
    message
  }
}
```
**Example Request:**
```json
{
  "where": { "id": "2" }
}
```
**Example Response:**
```json
{
  "data": {
    "deleteRole": {
      "message": "Role deleted successfully!"
    }
  }
}
```

---

### Common

#### Get Dynamic Message
**Query:**
```graphql
query DynamicMessage($name: String) {
  dynamicMessage(name: $name) {
    message
  }
}
```
**Example Response:**
```json
{
  "data": {
    "dynamicMessage": {
      "message": "Welcome to the API!"
    }
  }
}
```

---

### Error Handling
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

---

## REST API

### Authentication

#### User Login
- **Endpoint:** `POST /api/v1/auth/login`
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

#### Register User
- **Endpoint:** `POST /api/v1/auth/register`
- **Request:**
  ```json
  {
    "email": "newuser@example.com",
    "password": "password123",
    "firstName": "Jane",
    "lastName": "Smith"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "message": "User registered successfully!",
    "user": {
      "id": "124",
      "email": "newuser@example.com",
      "firstName": "Jane",
      "lastName": "Smith"
    }
  }
  ```
- **Key Explanations:**
  - `status`: Status of the operation (`success` or `error`).
  - `message`: Human-readable message.
  - `user`: The registered user object.

#### Logout
- **Endpoint:** `POST /api/v1/auth/logout`
- **Request:**
  ```json
  {
    "refreshToken": "jwt-refresh-token"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "message": "Logged out successfully!"
  }
  ```

#### Refresh Token
- **Endpoint:** `POST /api/v1/auth/refresh-token`
- **Request:**
  ```json
  {
    "refreshToken": "jwt-refresh-token"
  }
  ```
- **Success Response:**
  ```json
  {
    "status": "success",
    "accessToken": "new-jwt-access-token",
    "refreshToken": "new-jwt-refresh-token"
  }
  ```

### File Upload

#### Get Signed URL
- **Endpoint:** `POST /api/v1/upload/signed-url`
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

### REST Error Handling
- All errors return a JSON object with `status: "error"` and a `message` key.

---

For more details on request/response shapes, see the GraphQL schema files and REST route handlers in the codebase. 