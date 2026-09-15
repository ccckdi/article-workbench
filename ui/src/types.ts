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
export interface ListResult<T> {
  items: T[];
  total: number;
  page: number;
  size: number;
}
export const roleNames: Record<Role, string> = {
  author: "作者",
  editor: "编辑",
  reviewer: "审核人员",
  publisher: "发布人员",
};
