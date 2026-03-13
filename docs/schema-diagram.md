# Paperguide Backend Schema Diagram

## Entity Relationship Diagram (Mermaid)

```mermaid
erDiagram
    users {
        bigint id PK
        string username UK
        string email UK
        string password_hash
        string role
        boolean is_active
        timestamp created_at
    }

    api_keys {
        bigint id PK
        bigint user_id FK
        string key_value UK
        string name
        boolean is_active
        integer usage_count
        timestamp created_at
    }

    workspaces {
        uuid id PK
        bigint user_id FK
        string name
        text description
        string status
        timestamp created_at
        timestamp updated_at
    }

    research_sessions {
        bigint id PK
        uuid workspace_id FK
        bigint user_id FK
        text topic
        text refined_topic
        string title
        string status
        string trigger_source
        string depth
        jsonb result_json
        text report_markdown
        text latex_source
        integer retry_count
        string current_stage
        string share_token
        timestamp started_at
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }

    research_logs {
        bigint id PK
        bigint user_id FK
        string title
        text task
        string status
        jsonb result_json
        integer retry_count
        string current_stage
        timestamp started_at
        timestamp completed_at
        timestamp created_at
        timestamp updated_at
    }

    workspace_uploads {
        bigint id PK
        uuid workspace_id FK
        bigint user_id FK
        string filename
        string file_type
        bigint file_size_bytes
        string embedding_status
        integer chunk_count
        timestamp created_at
    }

    data_sources {
        bigint id PK
        bigint research_id FK
        uuid workspace_id FK
        string source_type
        string domain
        text url
        string status
        integer items_found
        string title
        text description
        string favicon
        string thumbnail
        string published_date
        text citation_text
        timestamp created_at
    }

    chat_history {
        bigint id PK
        string session_id
        bigint user_id FK
        uuid workspace_id FK
        bigint research_session_id FK
        string role
        text message
        timestamp created_at
    }

    execution_events {
        bigint id PK
        bigint research_id FK
        bigint session_id FK
        string event_id UK
        string stage
        string severity
        string category
        text message
        jsonb details
        timestamp created_at
    }

    user_memories {
        bigint id PK
        bigint user_id FK
        uuid workspace_id FK
        text content
        string source
        bigint source_id
        jsonb metadata
        timestamp created_at
        timestamp updated_at
    }

    embeddings_meta {
        bigint id PK
        uuid workspace_id FK
        bigint session_id FK
        string source_type
        text source_url
        integer chunk_index
        string vector_id
        text content_preview
        timestamp created_at
    }

    %% Relationships
    users ||--o{ api_keys : "has"
    users ||--o{ workspaces : "owns"
    users ||--o{ research_logs : "initiates"
    users ||--o{ chat_history : "participates"
    users ||--o{ user_memories : "creates"

    workspaces ||--o{ research_sessions : "contains"
    workspaces ||--o{ workspace_uploads : "stores"
    workspaces ||--o{ data_sources : "references"
    workspaces ||--o{ chat_history : "scopes"
    workspaces ||--o{ user_memories : "scopes"

    research_sessions ||--o{ data_sources : "generates"
    research_sessions ||--o{ chat_history : "enables"
    research_sessions ||--o{ embeddings_meta : "produces"
    research_sessions ||--o{ execution_events : "triggers"

    research_logs ||--o{ data_sources : "generates"
    research_logs ||--o{ execution_events : "triggers"

    workspace_uploads ||--o{ embeddings_meta : "inputs"
```

## Key Relationships Explained

### Core User Flow
1. **User** creates **API Keys** for external access
2. **User** creates **Workspaces** (isolated containers)
3. **User** initiates **Research Sessions** within a workspace
4. **Research Sessions** generate **Data Sources**, **Execution Events**, and **Embeddings**
5. **Research Sessions** enable **Chat History** scoped to the workspace

### Workspace Isolation Pattern
- All research artifacts are scoped by `workspace_id` (UUID)
- `research_sessions` replaced `research_logs` for new workspace-aware flow
- Legacy `research_logs` still supported for backward compatibility
- Dual-source support: `data_sources` and `execution_events` can reference either table

### Data Flow
1. **Research Creation**: User → Workspace → Research Session → AI Engine
2. **Progress Tracking**: AI Engine → Execution Events → SSE Stream → Frontend
3. **RAG Pipeline**: Uploads → Embeddings → Chat Context
4. **Sharing**: Research Session → Share Token → Public Access

### Index Strategy
- **Performance**: User-scoped indexes on foreign keys
- **Search**: Full-text search on `user_memories.content` using GIN
- **Time-based**: Composite indexes on `(status, created_at)` for efficient queries
- **Uniqueness**: Natural keys and unique constraints on identifiers

### Migration Path
- **Migration 007**: Introduced workspace isolation with UUID PKs
- **Migration 008**: Enabled dual-source support (research_logs + research_sessions)
- **Backward Compatibility**: All new tables nullable for legacy flow

## Schema Design Principles

1. **Workspace Isolation**: UUID primary keys prevent ID collisions across environments
2. **Soft Deletes**: Workspaces archived rather than deleted for data recovery
3. **Cascade Cleanup**: Proper FK constraints maintain referential integrity
4. **Audit Trail**: `created_at`/`updated_at` on all mutable entities
5. **Flexible Metadata**: JSONB fields allow extensible data storage
6. **Performance Optimization**: Strategic indexes for common query patterns
7. **Security**: User-scoped data isolation with workspace boundaries

## Usage Notes

### For Frontend Developers
- Use `workspace_id` (UUID) for all workspace-scoped operations
- Check both `research_logs` and `research_sessions` for backward compatibility
- Handle `share_token` for public research sharing
- Use SSE events for real-time progress updates
- Respect soft deletes by checking `status = 'archived'`

### For Backend Developers
- Always validate `workspace_id` ownership in workspace-scoped routes
- Use transactions for multi-table operations
- Implement proper error handling with consistent JSON error format
- Use the `trigger_source = 'user'` filter to avoid reprocessing system jobs
- Support both legacy and new research session tables during transition period
