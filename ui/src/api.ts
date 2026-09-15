export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
export async function api<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  if (options.body) headers.set("Content-Type", "application/json");
  try {
    if (options.method && !["GET", "HEAD"].includes(options.method)) {
      const csrf = await fetch("/api/csrf", { credentials: "same-origin" });
      if (!csrf.ok)
        throw new ApiError(csrf.status, "无法完成安全校验，请刷新后重试");
      const token = await csrf.json();
      headers.set(token.headerName, token.token);
    }
    const response = await fetch(`/api${path}`, {
      ...options,
      headers,
      credentials: "same-origin",
    });
    if (response.status === 204) return undefined as T;
    const body = await response.json();
    if (!response.ok)
      throw new ApiError(response.status, body.message || "请求无法完成");
    return body;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new Error("网络连接异常，请稍后重试。你的输入仍保留在页面中。");
  }
}
