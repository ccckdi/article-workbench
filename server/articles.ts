import { randomUUID } from "node:crypto";
import type { Database } from "./database.js";
import type {
  Article,
  ArticleInput,
  ArticleList,
  User,
} from "../shared/types.js";

export class HttpError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
  }
}
type ArticleRow = {
  id: string;
  title: string;
  excerpt: string;
  body: string;
  author_id: string;
  author_name: string;
  status: "draft" | "published";
  created_at: string;
  updated_at: string;
  published_at: string | null;
};
const selection = `SELECT a.*, u.display_name AS author_name FROM articles a JOIN users u ON a.author_id=u.id`;
function mapArticle(row: ArticleRow): Article {
  return {
    id: row.id,
    title: row.title,
    excerpt: row.excerpt,
    body: row.body,
    authorId: row.author_id,
    authorName: row.author_name,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at,
  };
}
export const canSeeAll = (user: User) =>
  user.roles.some((r) => ["editor", "reviewer", "publisher"].includes(r));
export const canEdit = (user: User, article: Article) =>
  user.roles.includes("editor") || article.authorId === user.id;
export function getArticle(db: Database, id: string, user?: User): Article {
  const row = db.prepare(`${selection} WHERE a.id=?`).get(id) as unknown as
    | ArticleRow
    | undefined;
  if (
    !row ||
    (!user && row.status !== "published") ||
    (user && !canSeeAll(user) && row.author_id !== user.id)
  ) {
    throw new HttpError(404, "文章不存在或无权访问");
  }
  return mapArticle(row);
}
export interface ListQuery {
  q?: string;
  status?: "draft" | "published";
  page?: number;
}
export function listArticles(
  db: Database,
  query: ListQuery,
  user?: User,
): ArticleList {
  const clauses = ["1=1"];
  const values: (string | number)[] = [];
  if (!user) clauses.push("a.status='published'");
  else if (!canSeeAll(user)) {
    clauses.push("a.author_id=?");
    values.push(user.id);
  }
  if (query.status) {
    clauses.push("a.status=?");
    values.push(query.status);
  }
  if (query.q) {
    clauses.push("a.title LIKE ?");
    values.push(`%${query.q}%`);
  }
  const where = clauses.join(" AND ");
  const total = Number(
    db
      .prepare(`SELECT COUNT(*) AS total FROM articles a WHERE ${where}`)
      .get(...values)?.total,
  );
  const page = query.page ?? 1;
  const pageSize = 20;
  const rows = db
    .prepare(
      `${selection} WHERE ${where} ORDER BY a.updated_at DESC, a.id LIMIT ? OFFSET ?`,
    )
    .all(...values, pageSize, (page - 1) * pageSize) as unknown as ArticleRow[];
  return { items: rows.map(mapArticle), total, page, pageSize };
}
function cleanInput(input: ArticleInput): ArticleInput {
  const title = input.title.trim();
  if (!title) throw new HttpError(400, "请输入文章标题");
  return { title, excerpt: input.excerpt.trim(), body: input.body };
}
export function createArticle(db: Database, input: ArticleInput, user: User) {
  if (!user.roles.some((r) => r === "author" || r === "editor"))
    throw new HttpError(403, "当前账号没有写作权限");
  const { title, excerpt, body } = cleanInput(input);
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO articles(id,title,excerpt,body,author_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?)`,
  ).run(id, title, excerpt, body, user.id, now, now);
  return getArticle(db, id, user);
}
export function updateArticle(
  db: Database,
  id: string,
  input: ArticleInput,
  user: User,
) {
  const article = getArticle(db, id, user);
  if (!canEdit(user, article)) throw new HttpError(403, "当前账号没有编辑权限");
  const { title, excerpt, body } = cleanInput(input);
  db.prepare(
    "UPDATE articles SET title=?, excerpt=?, body=?, updated_at=? WHERE id=?",
  ).run(title, excerpt, body, new Date().toISOString(), id);
  return getArticle(db, id, user);
}
export function setPublication(
  db: Database,
  id: string,
  published: boolean,
  user: User,
) {
  if (!user.roles.includes("publisher"))
    throw new HttpError(403, "当前账号没有发布权限");
  const article = getArticle(db, id, user);
  const status = published ? "published" : "draft";
  if (article.status !== status) {
    const now = new Date().toISOString();
    db.prepare(
      "UPDATE articles SET status=?, published_at=?, updated_at=? WHERE id=?",
    ).run(status, published ? now : null, now, id);
  }
  return getArticle(db, id, user);
}
