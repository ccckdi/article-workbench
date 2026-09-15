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
  let response: Response;
  try {
    response = await fetch(`/api${path}`, {
      credentials: "same-origin",
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...options.headers,
      },
    });
  } catch {
    throw new ApiError(0, "连接失败，请检查服务是否已启动");
  }
  if (response.status === 204) return undefined as T;
  const data = await response.json();
  if (!response.ok)
    throw new ApiError(response.status, data.message || "操作失败，请重试");
  return data as T;
}
