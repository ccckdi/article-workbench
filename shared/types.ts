export type Role = "author" | "editor" | "reviewer" | "publisher";
export interface User {
  id: string;
  username: string;
  displayName: string;
  roles: Role[];
}
export interface ArticleInput {
  title: string;
  excerpt: string;
  body: string;
}
export interface Article extends ArticleInput {
  id: string;
  authorId: string;
  authorName: string;
  status: "draft" | "published";
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}
export interface ArticleList {
  items: Article[];
  total: number;
  page: number;
  pageSize: number;
}
