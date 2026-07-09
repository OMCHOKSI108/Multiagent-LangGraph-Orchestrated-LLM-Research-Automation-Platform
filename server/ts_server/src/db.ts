import { Sequelize, DataTypes, Model, Op as SequelizeOp, InferAttributes, InferCreationAttributes, CreationOptional, ForeignKey } from "sequelize";

export const Op = SequelizeOp;
import logger from "./logger.js";

export const sequelize = new Sequelize(
  process.env.POSTGRES_DB || "kuchi_db",
  process.env.POSTGRES_USER || "kuchi_user",
  process.env.POSTGRES_PASSWORD || "kuchi_password",
  {
    host: process.env.POSTGRES_HOST || "localhost",
    port: parseInt(process.env.POSTGRES_PORT || "5432", 10),
    dialect: "postgres",
    logging: (msg: string) => logger.debug(msg),
    pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
  },
);

// ── User ──
interface UserAttributes {
  id: string;
  email: string;
  name: string;
  username: string;
  password: string;
  email_verified: boolean;
  created_at: Date;
}

export class User extends Model<InferAttributes<User>, InferCreationAttributes<User, { omit: "id" | "email_verified" | "created_at" }>> implements UserAttributes {
  declare id: CreationOptional<string>;
  declare email: string;
  declare name: string;
  declare username: string;
  declare password: string;
  declare email_verified: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
}

User.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    name: { type: DataTypes.STRING, allowNull: false },
    username: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false },
    email_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "users",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
  },
);

// ── Token ──
export type TokenType = "email_verify" | "magic_link" | "password_reset";

interface TokenAttributes {
  id: string;
  user_id: string;
  type: TokenType;
  expires_at: Date;
  used: boolean;
  created_at: Date;
}

export class Token extends Model<InferAttributes<Token>, InferCreationAttributes<Token, { omit: "id" | "created_at" }>> implements TokenAttributes {
  declare id: CreationOptional<string>;
  declare user_id: ForeignKey<User["id"]>;
  declare type: TokenType;
  declare expires_at: Date;
  declare used: CreationOptional<boolean>;
  declare created_at: CreationOptional<Date>;
}

Token.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    type: {
      type: DataTypes.ENUM("email_verify", "magic_link", "password_reset"),
      allowNull: false,
    },
    expires_at: { type: DataTypes.DATE, allowNull: false },
    used: { type: DataTypes.BOOLEAN, defaultValue: false },
    created_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "tokens",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [
      { fields: ["user_id"] },
      { fields: ["type"] },
    ],
  },
);

// ── ResearchSession ──
export type SessionStatus = "in_progress" | "completed" | "failed";

interface ResearchSessionAttributes {
  id: string;
  user_id: string;
  title: string;
  status: SessionStatus;
  created_at: Date;
  updated_at: Date;
}

export class ResearchSession extends Model<InferAttributes<ResearchSession>, InferCreationAttributes<ResearchSession, { omit: "id" | "created_at" | "updated_at" }>> implements ResearchSessionAttributes {
  declare id: CreationOptional<string>;
  declare user_id: ForeignKey<User["id"]>;
  declare title: string;
  declare status: CreationOptional<SessionStatus>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

ResearchSession.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    title: { type: DataTypes.STRING, allowNull: false },
    status: {
      type: DataTypes.ENUM("in_progress", "completed", "failed"),
      defaultValue: "in_progress",
    },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "research_sessions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

// ── Source ──
interface SourceAttributes {
  id: string;
  session_id: string;
  url: string;
  title: string | null;
  source_type: string;
  author: string | null;
  published_at: Date | null;
  trust_score: number;
  relevance_score: number;
  freshness_score: number;
  created_at: Date;
}

export class Source extends Model<InferAttributes<Source>, InferCreationAttributes<Source, { omit: "id" | "created_at" }>> implements SourceAttributes {
  declare id: CreationOptional<string>;
  declare session_id: ForeignKey<ResearchSession["id"]>;
  declare url: string;
  declare title: string | null;
  declare source_type: CreationOptional<string>;
  declare author: string | null;
  declare published_at: Date | null;
  declare trust_score: CreationOptional<number>;
  declare relevance_score: CreationOptional<number>;
  declare freshness_score: CreationOptional<number>;
  declare created_at: CreationOptional<Date>;
}

Source.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "research_sessions", key: "id" },
      onDelete: "CASCADE",
    },
    url: { type: DataTypes.STRING, allowNull: false },
    title: { type: DataTypes.STRING, allowNull: true },
    source_type: { type: DataTypes.STRING, defaultValue: "webpage" },
    author: { type: DataTypes.STRING, allowNull: true },
    published_at: { type: DataTypes.DATE, allowNull: true },
    trust_score: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    relevance_score: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    freshness_score: { type: DataTypes.FLOAT, defaultValue: 0.0 },
    created_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "sources",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["session_id"] }],
  },
);

// ── Project ──
interface ProjectAttributes {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export class Project extends Model<InferAttributes<Project>, InferCreationAttributes<Project, { omit: "id" | "created_at" | "updated_at" }>> implements ProjectAttributes {
  declare id: CreationOptional<string>;
  declare user_id: ForeignKey<User["id"]>;
  declare title: string;
  declare description: string | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

Project.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    title: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "projects",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["user_id"] }],
  },
);

// ── ChatSession ──
interface ChatSessionAttributes {
  id: string;
  user_id: string;
  title: string;
  created_at: Date;
  updated_at: Date;
}

export class ChatSession extends Model<InferAttributes<ChatSession>, InferCreationAttributes<ChatSession, { omit: "id" | "created_at" | "updated_at" }>> implements ChatSessionAttributes {
  declare id: CreationOptional<string>;
  declare user_id: ForeignKey<User["id"]>;
  declare title: string;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

ChatSession.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    title: { type: DataTypes.STRING, allowNull: false },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "chat_sessions",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["user_id"] }],
  },
);

// ── ChatMessage ──
interface ChatMessageAttributes {
  id: string;
  chat_session_id: string;
  role: string;
  content: string;
  created_at: Date;
}

export class ChatMessage extends Model<InferAttributes<ChatMessage>, InferCreationAttributes<ChatMessage, { omit: "id" | "created_at" }>> implements ChatMessageAttributes {
  declare id: CreationOptional<string>;
  declare chat_session_id: ForeignKey<ChatSession["id"]>;
  declare role: string;
  declare content: string;
  declare created_at: CreationOptional<Date>;
}

ChatMessage.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    chat_session_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "chat_sessions", key: "id" },
      onDelete: "CASCADE",
    },
    role: { type: DataTypes.STRING, allowNull: false },
    content: { type: DataTypes.TEXT, allowNull: false },
    created_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "chat_messages",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["chat_session_id"] }],
  },
);

// ── ApiKey ──
interface ApiKeyAttributes {
  id: string;
  user_id: string;
  key_hash: string;
  provider: string;
  label: string | null;
  last_used_at: Date | null;
  usage_limit: number | null;
  created_at: Date;
  updated_at: Date;
}

export class ApiKey extends Model<InferAttributes<ApiKey>, InferCreationAttributes<ApiKey, { omit: "id" | "last_used_at" | "created_at" | "updated_at" }>> implements ApiKeyAttributes {
  declare id: CreationOptional<string>;
  declare user_id: ForeignKey<User["id"]>;
  declare key_hash: string;
  declare provider: string;
  declare label: string | null;
  declare last_used_at: CreationOptional<Date | null>;
  declare usage_limit: number | null;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

ApiKey.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    key_hash: { type: DataTypes.STRING, allowNull: false },
    provider: { type: DataTypes.STRING, allowNull: false },
    label: { type: DataTypes.STRING, allowNull: true },
    last_used_at: { type: DataTypes.DATE, allowNull: true },
    usage_limit: { type: DataTypes.INTEGER, allowNull: true },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "api_keys",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
    indexes: [{ fields: ["user_id"] }, { fields: ["provider"] }],
  },
);

// ── Template ──
interface TemplateAttributes {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  config: Record<string, unknown>;
  created_at: Date;
}

export class Template extends Model<InferAttributes<Template>, InferCreationAttributes<Template, { omit: "id" | "created_at" }>> implements TemplateAttributes {
  declare id: CreationOptional<string>;
  declare user_id: ForeignKey<User["id"]>;
  declare name: string;
  declare description: string | null;
  declare config: Record<string, unknown>;
  declare created_at: CreationOptional<Date>;
}

Template.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    name: { type: DataTypes.STRING, allowNull: false },
    description: { type: DataTypes.TEXT, allowNull: true },
    config: { type: DataTypes.JSONB, defaultValue: {} },
    created_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "templates",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: false,
    indexes: [{ fields: ["user_id"] }],
  },
);

// ── UserSetting ──
interface UserSettingAttributes {
  id: string;
  user_id: string;
  bio: string | null;
  dob: string | null;
  personalization_prompt: string | null;
  default_depth: string;
  output_style: string;
  citation_preference: string;
  export_preference: string;
  created_at: Date;
  updated_at: Date;
}

export class UserSetting extends Model<InferAttributes<UserSetting>, InferCreationAttributes<UserSetting, { omit: "id" | "created_at" | "updated_at" }>> implements UserSettingAttributes {
  declare id: CreationOptional<string>;
  declare user_id: ForeignKey<User["id"]>;
  declare bio: string | null;
  declare dob: string | null;
  declare personalization_prompt: string | null;
  declare default_depth: CreationOptional<string>;
  declare output_style: CreationOptional<string>;
  declare citation_preference: CreationOptional<string>;
  declare export_preference: CreationOptional<string>;
  declare created_at: CreationOptional<Date>;
  declare updated_at: CreationOptional<Date>;
}

UserSetting.init(
  {
    id: { type: DataTypes.UUID, primaryKey: true, defaultValue: DataTypes.UUIDV4 },
    user_id: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true,
      references: { model: "users", key: "id" },
      onDelete: "CASCADE",
    },
    bio: { type: DataTypes.TEXT, allowNull: true },
    dob: { type: DataTypes.STRING, allowNull: true },
    personalization_prompt: { type: DataTypes.TEXT, allowNull: true },
    default_depth: { type: DataTypes.STRING, defaultValue: "Deep" },
    output_style: { type: DataTypes.STRING, defaultValue: "Detailed" },
    citation_preference: { type: DataTypes.STRING, defaultValue: "Standard" },
    export_preference: { type: DataTypes.STRING, defaultValue: "PDF" },
    created_at: { type: DataTypes.DATE },
    updated_at: { type: DataTypes.DATE },
  },
  {
    sequelize,
    tableName: "user_settings",
    timestamps: true,
    createdAt: "created_at",
    updatedAt: "updated_at",
  },
);

// ── Associations ──
User.hasMany(Token, { foreignKey: "user_id" });
Token.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(ResearchSession, { foreignKey: "user_id" });
ResearchSession.belongsTo(User, { foreignKey: "user_id" });

ResearchSession.hasMany(Source, { foreignKey: "session_id" });
Source.belongsTo(ResearchSession, { foreignKey: "session_id" });

User.hasMany(Template, { foreignKey: "user_id" });
Template.belongsTo(User, { foreignKey: "user_id" });

User.hasOne(UserSetting, { foreignKey: "user_id" });
UserSetting.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(Project, { foreignKey: "user_id" });
Project.belongsTo(User, { foreignKey: "user_id" });

User.hasMany(ChatSession, { foreignKey: "user_id" });
ChatSession.belongsTo(User, { foreignKey: "user_id" });

ChatSession.hasMany(ChatMessage, { foreignKey: "chat_session_id" });
ChatMessage.belongsTo(ChatSession, { foreignKey: "chat_session_id" });

User.hasMany(ApiKey, { foreignKey: "user_id" });
ApiKey.belongsTo(User, { foreignKey: "user_id" });
