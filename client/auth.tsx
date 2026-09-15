import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { User } from "../shared/types";
import { api } from "./api";

interface AuthValue {
  user: User | null;
  loading: boolean;
  error: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const AuthContext = createContext<AuthValue | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    api<{ user: User | null }>("/session")
      .then((data) => setUser(data.user))
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);
  async function login(username: string, password: string) {
    const data = await api<{ user: User }>("/session", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    setUser(data.user);
    setError("");
  }
  async function logout() {
    await api("/session", { method: "DELETE" });
    setUser(null);
  }
  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}
export function useAuth() {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error("AuthProvider missing");
  return auth;
}
