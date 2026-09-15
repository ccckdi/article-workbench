import Fastify, { type FastifyError } from "fastify";
import cookie from "@fastify/cookie";
import serveStatic from "@fastify/static";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { openDatabase } from "./database.js";
import {
  authenticate,
  newSession,
  removeSession,
  sessionCookie,
  sessionLifetime,
  sessionUser,
} from "./auth.js";
import {
  createArticle,
  getArticle,
  HttpError,
  listArticles,
  setPublication,
  updateArticle,
} from "./articles.js";
import type { ListQuery } from "./articles.js";
import type { ArticleInput, User } from "../shared/types.js";

declare module "fastify" {
  interface FastifyRequest {
    user: User | null;
  }
}
const articleBody = {
  type: "object",
  additionalProperties: false,
  required: ["title", "excerpt", "body"],
  properties: {
    title: { type: "string", minLength: 1, maxLength: 200 },
    excerpt: { type: "string", maxLength: 500 },
    body: { type: "string", maxLength: 50000 },
  },
};
const idParams = {
  type: "object",
  required: ["id"],
  properties: { id: { type: "string", minLength: 1, maxLength: 100 } },
};
const querySchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    q: { type: "string", maxLength: 200 },
    status: { enum: ["draft", "published"] },
    page: { type: "integer", minimum: 1, maximum: 10000 },
  },
};
export interface AppOptions {
  databasePath?: string;
  staticDir?: string;
  allowedOrigins?: string[];
  secureCookie?: boolean;
  logger?: boolean;
}
export async function createApp(options: AppOptions = {}) {
  const app = Fastify({
    logger: options.logger ?? false,
    bodyLimit: 256 * 1024,
    ajv: { customOptions: { removeAdditional: false } },
  });
  const db = openDatabase(
    options.databasePath ??
      process.env.DATABASE_PATH ??
      "./data/workbench.sqlite",
  );
  app.addHook("onClose", async () => {
    db.close();
  });
  await app.register(cookie);
  app.decorateRequest("user", null);
  const allowedOrigins = options.allowedOrigins ?? [
    process.env.APP_ORIGIN || "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:3001",
    "http://127.0.0.1:3001",
  ];
  const cookieOptions = {
    path: "/",
    httpOnly: true,
    sameSite: "strict" as const,
    secure: options.secureCookie ?? process.env.COOKIE_SECURE === "true",
  };
  app.addHook("onRequest", async (request, reply) => {
    reply
      .header("X-Content-Type-Options", "nosniff")
      .header("Referrer-Policy", "same-origin");
    if (!request.url.startsWith("/api/")) return;
    reply.header("Cache-Control", "no-store");
    if (
      !["GET", "HEAD", "OPTIONS"].includes(request.method) &&
      request.headers.origin &&
      !allowedOrigins.includes(request.headers.origin)
    ) {
      throw new HttpError(403, "请求来源不允许");
    }
    request.user = sessionUser(db, request.cookies[sessionCookie]);
  });
  app.setErrorHandler<FastifyError>((error, request, reply) => {
    const code =
      error.statusCode && error.statusCode >= 400 && error.statusCode < 600
        ? error.statusCode
        : 500;
    if (code >= 500) request.log.error(error);
    reply
      .code(code)
      .send({
        message: error.validation
          ? "请求字段不符合要求"
          : code >= 500
            ? "服务暂时无法处理请求"
            : error.message,
      });
  });
  const requireUser = (user: User | null): User => {
    if (!user) throw new HttpError(401, "请先登录");
    return user;
  };
  app.get("/api/health", async () => {
    db.prepare("SELECT 1").get();
    return { status: "ok" };
  });
  app.get("/api/session", async (request) => ({ user: request.user }));
  app.post<{ Body: { username: string; password: string } }>(
    "/api/session",
    {
      schema: {
        body: {
          type: "object",
          additionalProperties: false,
          required: ["username", "password"],
          properties: {
            username: { type: "string", minLength: 1, maxLength: 80 },
            password: { type: "string", minLength: 1, maxLength: 200 },
          },
        },
      },
    },
    async (request, reply) => {
      const user = authenticate(
        db,
        request.body.username.trim(),
        request.body.password,
      );
      if (!user) throw new HttpError(401, "账号或密码不正确");
      removeSession(db, request.cookies[sessionCookie]);
      const token = newSession(db, user.id);
      reply.setCookie(sessionCookie, token, {
        ...cookieOptions,
        maxAge: sessionLifetime,
      });
      return { user };
    },
  );
  app.delete("/api/session", async (request, reply) => {
    removeSession(db, request.cookies[sessionCookie]);
    reply.clearCookie(sessionCookie, cookieOptions).code(204).send();
  });
  app.get<{ Querystring: ListQuery }>(
    "/api/articles",
    { schema: { querystring: querySchema } },
    async (request) =>
      listArticles(db, request.query, requireUser(request.user)),
  );
  app.get<{ Params: { id: string } }>(
    "/api/articles/:id",
    { schema: { params: idParams } },
    async (request) => ({
      article: getArticle(db, request.params.id, requireUser(request.user)),
    }),
  );
  app.post<{ Body: ArticleInput }>(
    "/api/articles",
    { schema: { body: articleBody } },
    async (request, reply) => {
      const article = createArticle(
        db,
        request.body,
        requireUser(request.user),
      );
      reply.code(201);
      return { article };
    },
  );
  app.put<{ Params: { id: string }; Body: ArticleInput }>(
    "/api/articles/:id",
    { schema: { params: idParams, body: articleBody } },
    async (request) => ({
      article: updateArticle(
        db,
        request.params.id,
        request.body,
        requireUser(request.user),
      ),
    }),
  );
  app.post<{ Params: { id: string } }>(
    "/api/articles/:id/publish",
    { schema: { params: idParams } },
    async (request) => ({
      article: setPublication(
        db,
        request.params.id,
        true,
        requireUser(request.user),
      ),
    }),
  );
  app.post<{ Params: { id: string } }>(
    "/api/articles/:id/unpublish",
    { schema: { params: idParams } },
    async (request) => ({
      article: setPublication(
        db,
        request.params.id,
        false,
        requireUser(request.user),
      ),
    }),
  );
  app.get<{ Querystring: ListQuery }>(
    "/api/public/articles",
    { schema: { querystring: querySchema } },
    async (request) => listArticles(db, request.query),
  );
  app.get<{ Params: { id: string } }>(
    "/api/public/articles/:id",
    { schema: { params: idParams } },
    async (request) => ({ article: getArticle(db, request.params.id) }),
  );
  const staticDir = resolve(options.staticDir ?? "dist/web");
  if (existsSync(resolve(staticDir, "index.html"))) {
    await app.register(serveStatic, { root: staticDir });
    app.setNotFoundHandler((request, reply) => {
      if (
        request.url.startsWith("/api/") ||
        !["GET", "HEAD"].includes(request.method) ||
        !request.headers.accept?.includes("text/html")
      )
        return reply.code(404).send({ message: "页面不存在" });
      return reply.sendFile("index.html");
    });
  }
  return app;
}
