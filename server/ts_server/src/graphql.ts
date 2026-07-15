import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { makeExecutableSchema } from "@graphql-tools/schema";
import {
  User,
  Token,
  ResearchSession,
  Source,
  Template,
  UserSetting,
  Project,
  ApiKey,
  Op,
} from "./db.js";
import { sendEmail, buildVerificationEmail, buildMagicLinkEmail, buildPasswordResetEmail, buildWelcomeEmail, buildPasswordChangedEmail } from "./email.js";
import { researchQueue } from "./queue.js";
import logger from "./logger.js";
import type { TokenType } from "./db.js";
import { authDirectiveTransformer } from "./authDirective.js";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const APP_URL = process.env.APP_URL || "http://localhost:3000";
const FASTAPI_URL = process.env.FASTAPI_URL || "http://localhost:8000";

const typeDefs = `#graphql
  directive @auth on FIELD_DEFINITION
  type User {
    id: ID!
    email: String!
    name: String!
    username: String!
    initials: String!
    emailVerified: Boolean!
    createdAt: String!
  }

  type AuthPayload {
    user: User!
    token: String!
  }

  type DashboardStats {
    researchReports: Int!
    sourcesAnalyzed: Int!
    savedTemplates: Int!
  }

  type ResearchSession {
    id: ID!
    title: String!
    status: String!
    createdAt: String!
    updatedAt: String!
  }

  type ResearchMessage {
    role: String!
    content: String!
  }

  type ResearchSource {
    title: String
    url: String!
  }

  type ResearchSessionDetail {
    id: ID!
    title: String!
    status: String!
    messages: [ResearchMessage!]!
    sources: [ResearchSource!]!
  }

  type ResearchJobResult {
    sessionId: ID!
    jobId: String!
  }

  type Project {
    id: ID!
    title: String!
    description: String
    createdAt: String!
    updatedAt: String!
  }

  type ApiKey {
    id: ID!
    provider: String!
    label: String
    keyPreview: String!
    lastUsedAt: String
    usageLimit: Int
    createdAt: String!
  }

  type UserSetting {
    bio: String
    dob: String
    personalizationPrompt: String
    defaultDepth: String
    outputStyle: String
    citationPreference: String
    exportPreference: String
  }

  type Query {
    me: User
    checkEmail(email: String!): Boolean!
    checkUsername(username: String!): Boolean!
    verifiedUserCount: Int!
    dashboardStats: DashboardStats! @auth
    recentSessions(limit: Int): [ResearchSession!]! @auth
    mySessions: [ResearchSession!]! @auth
    researchSession(sessionId: ID!): ResearchSessionDetail @auth
    projects: [Project!]! @auth
    project(id: ID!): Project @auth
    apiKeys: [ApiKey!]! @auth
    mySettings: UserSetting @auth
  }

  type Mutation {
    register(
      email: String!
      name: String!
      username: String!
      password: String!
    ): Boolean!

    login(
      emailOrUsername: String!
      password: String!
    ): AuthPayload!

    sendMagicLink(emailOrUsername: String!): Boolean!

    verifyMagicLink(token: String!): AuthPayload!

    verifyEmail(token: String!): Boolean!

    forgotPassword(email: String!): Boolean!

    resetPassword(
      token: String!
      newPassword: String!
    ): AuthPayload!

    updateSettings(
      bio: String
      dob: String
      personalizationPrompt: String
      defaultDepth: String
      outputStyle: String
      citationPreference: String
      exportPreference: String
    ): UserSetting! @auth

    startResearch(question: String!, depth: String): ResearchJobResult! @auth
    cancelResearch(jobId: ID!): Boolean! @auth
    createProject(title: String!, description: String): Project! @auth
    updateProject(id: ID!, title: String, description: String): Project! @auth
    deleteProject(id: ID!): Boolean! @auth
    createApiKey(provider: String!, label: String, rawKey: String!): ApiKey! @auth
    deleteApiKey(id: ID!): Boolean! @auth
  }
`;

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((w) => w[0])
    .filter(Boolean)
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

async function createToken(userId: string, type: TokenType, hours = 24): Promise<string> {
  const expiresAt = new Date(Date.now() + hours * 3600000);
  const token = await Token.create({ user_id: userId, type, expires_at: expiresAt });
  return token.id;
}

async function consumeToken(tokenId: string, type: TokenType) {
  const token = await Token.findOne({
    where: { id: tokenId, type, used: false, expires_at: { [Op.gt]: new Date() } },
  });
  if (!token) return null;
  await token.update({ used: true });
  return token.get({ plain: true });
}

interface JwtPayload {
  id: string;
  email: string;
}

interface AuthUser {
  id: string;
  email: string;
  name: string;
  username: string;
  initials: string;
  emailVerified: boolean;
  createdAt: string;
}

interface AuthPayload {
  user: AuthUser;
  token: string;
}

interface BuildPayloadUser {
  id: string;
  email: string;
  name: string;
  username: string;
  email_verified: boolean;
  created_at: Date | string;
}

function buildPayload(user: BuildPayloadUser): AuthPayload {
  const payload: JwtPayload = { id: user.id, email: user.email };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      username: user.username,
      initials: getInitials(user.name),
      emailVerified: !!user.email_verified,
      createdAt: String(user.created_at),
    },
    token,
  };
}

export async function getUserFromToken(authorization: string | undefined): Promise<Record<string, unknown> | null> {
  if (!authorization?.startsWith("Bearer ")) return null;
  try {
    const payload = jwt.verify(authorization.slice(7), JWT_SECRET) as JwtPayload;
    const user = await User.findByPk(payload.id, { raw: true });
    return user ? (user as unknown as Record<string, unknown>) : null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    logger.warn("Invalid token:", message);
    return null;
  }
}

interface GraphQLContext {
  user: Record<string, unknown> | null;
}

interface UpdateSettingsArgs {
  bio?: string;
  dob?: string;
  personalizationPrompt?: string;
  defaultDepth?: string;
  outputStyle?: string;
  citationPreference?: string;
  exportPreference?: string;
}

export const resolvers = {
  Query: {
    me: (_parent: unknown, _args: unknown, { user }: GraphQLContext) => {
      if (!user) return null;
      return {
        id: user.id,
        email: user.email,
        name: user.name,
        username: user.username,
        initials: getInitials(user.name as string),
        emailVerified: !!(user.email_verified as boolean),
        createdAt: user.created_at,
      };
    },
    checkEmail: async (_parent: unknown, { email }: { email: string }) => {
      const user = await User.findOne({ where: { email }, raw: true });
      return !!user;
    },
    checkUsername: async (_parent: unknown, { username }: { username: string }) => {
      const user = await User.findOne({ where: { username }, raw: true });
      return !!user;
    },
    verifiedUserCount: async () => {
      return await User.count({ where: { email_verified: true } });
    },
    dashboardStats: async (_parent: unknown, _args: unknown, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const [researchReports, sourcesAnalyzed, savedTemplates] = await Promise.all([
        ResearchSession.count({ where: { user_id: uid, status: "completed" } }),
        Source.count({
          include: [{ model: ResearchSession, where: { user_id: uid }, required: true }],
        }),
        Template.count({ where: { user_id: uid } }),
      ]);
      return { researchReports, sourcesAnalyzed, savedTemplates };
    },
    recentSessions: async (_parent: unknown, { limit = 5 }: { limit?: number }, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const sessions = await ResearchSession.findAll({
        where: { user_id: uid },
        order: [["created_at", "DESC"]],
        limit,
        raw: true,
      });
      return sessions.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
    },
    mySessions: async (_parent: unknown, _args: unknown, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const sessions = await ResearchSession.findAll({
        where: { user_id: uid },
        order: [["created_at", "DESC"]],
        raw: true,
      });
      return sessions.map((s) => ({
        id: s.id,
        title: s.title,
        status: s.status,
        createdAt: s.created_at,
        updatedAt: s.updated_at,
      }));
    },
    mySettings: async (_parent: unknown, _args: unknown, { user }: GraphQLContext) => {
      if (!user) return null;
      const settings = await UserSetting.findOne({ where: { user_id: user.id as string }, raw: true });
      if (!settings) return null;
      return {
        bio: settings.bio,
        dob: settings.dob,
        personalizationPrompt: settings.personalization_prompt,
        defaultDepth: settings.default_depth,
        outputStyle: settings.output_style,
        citationPreference: settings.citation_preference,
        exportPreference: settings.export_preference,
      };
    },

    researchSession: async (_parent: unknown, { sessionId }: { sessionId: string }, { user }: GraphQLContext) => {
      try {
        const resp = await fetch(`${FASTAPI_URL}/api/research/sessions/${sessionId}`);
        if (!resp.ok) throw new Error("Session not found");
        return await resp.json();
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Research session error: ${message}`);
      }
    },

    projects: async (_parent: unknown, _args: unknown, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const rows = await Project.findAll({
        where: { user_id: uid },
        order: [["created_at", "DESC"]],
        raw: true,
      });
      return rows.map((p) => ({
        id: p.id,
        title: p.title,
        description: p.description,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      }));
    },

    project: async (_parent: unknown, { id }: { id: string }, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const p = await Project.findByPk(id, { raw: true });
      if (!p) throw new Error("Project not found");
      if (p.user_id !== uid) throw new Error("Not authorized");
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    },

    apiKeys: async (_parent: unknown, _args: unknown, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const rows = await ApiKey.findAll({
        where: { user_id: uid },
        order: [["created_at", "DESC"]],
        raw: true,
      });
      return rows.map((k) => ({
        id: k.id,
        provider: k.provider,
        label: k.label,
        keyPreview: k.key_hash.substring(0, 8),
        lastUsedAt: k.last_used_at,
        usageLimit: k.usage_limit,
        createdAt: k.created_at,
      }));
    },
  },

  Mutation: {
    register: async (_parent: unknown, { email, name, username, password }: { email: string; name: string; username: string; password: string }) => {
      const existingEmail = await User.findOne({ where: { email }, raw: true });
      if (existingEmail) throw new Error("Email already taken");

      const existingUsername = await User.findOne({ where: { username }, raw: true });
      if (existingUsername) throw new Error("Username already taken");

      const hashed = bcrypt.hashSync(password, 10);
      const user = await User.create({ email, name, username, password: hashed });

      const verifyToken = await createToken(user.id, "email_verify", 48);
      await sendEmail({
        to: email,
        subject: "Verify your email — Multiagent Research Automation Platform",
        html: buildVerificationEmail(name, verifyToken),
      }).catch((err: Error) => logger.error("Send email failed:", err.message));

      return true;
    },

    login: async (_parent: unknown, { emailOrUsername, password }: { emailOrUsername: string; password: string }) => {
      const user = await User.findOne({
        where: { [Op.or]: [{ email: emailOrUsername }, { username: emailOrUsername }] },
        raw: true,
      });
      if (!user || !bcrypt.compareSync(password, user.password)) {
        throw new Error("Invalid credentials");
      }
      if (!user.email_verified) {
        throw new Error("Please verify your email before logging in");
      }
      return buildPayload(user);
    },

    sendMagicLink: async (_parent: unknown, { emailOrUsername }: { emailOrUsername: string }) => {
      const user = await User.findOne({
        where: { [Op.or]: [{ email: emailOrUsername }, { username: emailOrUsername }] },
        raw: true,
      });
      if (!user) return true;

      const token = await createToken(user.id, "magic_link", 1);
      await sendEmail({
        to: user.email,
        subject: "Your sign-in link — Multiagent Research Automation Platform",
        html: buildMagicLinkEmail(user.name, token),
      }).catch((err: Error) => logger.error("Send email failed:", err.message));

      return true;
    },

    verifyMagicLink: async (_parent: unknown, { token }: { token: string }) => {
      const row = await consumeToken(token, "magic_link");
      if (!row) throw new Error("Invalid or expired link");

      const user = await User.findByPk(row.user_id, { raw: true });
      if (!user) throw new Error("User not found");

      return buildPayload(user);
    },

    verifyEmail: async (_parent: unknown, { token }: { token: string }) => {
      const row = await consumeToken(token, "email_verify");
      if (!row) throw new Error("Invalid or expired link");

      await User.update({ email_verified: true }, { where: { id: row.user_id } });

      const user = await User.findByPk(row.user_id, { raw: true });
      if (user) {
        sendEmail({
          to: user.email,
          subject: "Welcome to Multiagent Research Automation Platform",
          html: buildWelcomeEmail(user.name),
        }).catch((err: Error) => logger.error("Welcome email failed:", err.message));
      }

      return true;
    },

    forgotPassword: async (_parent: unknown, { email }: { email: string }) => {
      const user = await User.findOne({ where: { email }, raw: true });
      if (!user) return true;

      const token = await createToken(user.id, "password_reset", 1);
      await sendEmail({
        to: email,
        subject: "Reset your password — Multiagent Research Automation Platform",
        html: buildPasswordResetEmail(user.name, token),
      }).catch((err: Error) => logger.error("Send email failed:", err.message));

      return true;
    },

    resetPassword: async (_parent: unknown, { token, newPassword }: { token: string; newPassword: string }) => {
      const row = await consumeToken(token, "password_reset");
      if (!row) throw new Error("Invalid or expired link");

      const hashed = bcrypt.hashSync(newPassword, 10);
      await User.update({ password: hashed }, { where: { id: row.user_id } });

      const user = await User.findByPk(row.user_id, { raw: true });

      if (user) {
        sendEmail({
          to: user.email,
          subject: "Your password has been changed — Multiagent Research Automation Platform",
          html: buildPasswordChangedEmail(user.name),
        }).catch((err: Error) => logger.error("Password changed email failed:", err.message));
      }

      return buildPayload(user!);
    },

    updateSettings: async (_parent: unknown, args: UpdateSettingsArgs, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const fields: Record<string, string | undefined> = {
        bio: args.bio,
        dob: args.dob,
        personalization_prompt: args.personalizationPrompt,
        default_depth: args.defaultDepth,
        output_style: args.outputStyle,
        citation_preference: args.citationPreference,
        export_preference: args.exportPreference,
      };
      Object.keys(fields).forEach((k) => fields[k] === undefined && delete fields[k]);

      const [setting] = await UserSetting.upsert(
        { user_id: uid, ...fields },
        { returning: true },
      );
      const raw = setting!.get({ plain: true });
      return {
        bio: raw.bio,
        dob: raw.dob,
        personalizationPrompt: raw.personalization_prompt,
        defaultDepth: raw.default_depth,
        outputStyle: raw.output_style,
        citationPreference: raw.citation_preference,
        exportPreference: raw.export_preference,
      };
    },

    cancelResearch: async (_parent: unknown, { jobId }: { jobId: string }, { user }: GraphQLContext) => {
      if (!user) throw new Error("Not authenticated");
      try {
        const resp = await fetch(`${FASTAPI_URL}/api/research/cancel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ job_id: jobId }),
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(text);
        }
        return true;
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        logger.error(`Cancel research job ${jobId} failed: ${message}`);
        throw new Error(`Failed to cancel research: ${message}`);
      }
    },

    startResearch: async (_parent: unknown, { question, depth }: { question: string; depth?: string }, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      try {
        const sessionId = randomUUID();
        const job = await researchQueue.add("research", {
          question,
          userId: uid,
          depth,
          sessionId,
        });
        return { sessionId, jobId: job.id };
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`Research failed: ${message}`);
      }
    },

    createProject: async (_parent: unknown, { title, description }: { title: string; description?: string }, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const p = await Project.create({
        user_id: uid,
        title,
        description: description ?? null,
      });
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    },

    updateProject: async (_parent: unknown, { id, title, description }: { id: string; title?: string; description?: string }, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const p = await Project.findByPk(id);
      if (!p) throw new Error("Project not found");
      if (p.user_id !== uid) throw new Error("Not authorized");
      if (title !== undefined) p.title = title;
      if (description !== undefined) p.description = description;
      await p.save();
      return {
        id: p.id,
        title: p.title,
        description: p.description,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      };
    },

    deleteProject: async (_parent: unknown, { id }: { id: string }, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const p = await Project.findByPk(id);
      if (!p) throw new Error("Project not found");
      if (p.user_id !== uid) throw new Error("Not authorized");
      await p.destroy();
      return true;
    },

    createApiKey: async (_parent: unknown, { provider, label, rawKey }: { provider: string; label?: string; rawKey: string }, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const key_hash = bcrypt.hashSync(rawKey, 10);
      const k = await ApiKey.create({
        user_id: uid,
        provider,
        label: label ?? null,
        key_hash,
      });
      return {
        id: k.id,
        provider: k.provider,
        label: k.label,
        keyPreview: k.key_hash.substring(0, 8),
        lastUsedAt: k.last_used_at,
        usageLimit: k.usage_limit,
        createdAt: k.created_at,
      };
    },

    deleteApiKey: async (_parent: unknown, { id }: { id: string }, { user }: GraphQLContext) => {
      const uid = user!.id as string;
      const k = await ApiKey.findByPk(id);
      if (!k) throw new Error("ApiKey not found");
      if (k.user_id !== uid) throw new Error("Not authorized");
      await k.destroy();
      return true;
    },
  },
};

const rawSchema = makeExecutableSchema({ typeDefs, resolvers });
export const schema = authDirectiveTransformer(rawSchema);
