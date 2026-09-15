const origin = import.meta.env.DEV
  ? import.meta.env.VITE_PUBLIC_ORIGIN || "http://localhost:8090"
  : "";
export function publicUrl(path = "/") {
  return origin + path;
}
