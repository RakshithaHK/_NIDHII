import { createContext, useContext, useEffect, useState } from "react";
import api from "./api";

const AuthCtx = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = localStorage.getItem("nidhii_token");
    if (!t) { setLoading(false); return; }
    api.get("/auth/me").then((r) => setUser(r.data)).catch(() => {
      localStorage.removeItem("nidhii_token");
    }).finally(() => setLoading(false));
  }, []);

  const signIn = async (email, password) => {
    const { data } = await api.post("/auth/login", { email, password });
    localStorage.setItem("nidhii_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const signUp = async (payload) => {
    const { data } = await api.post("/auth/signup", payload);
    localStorage.setItem("nidhii_token", data.token);
    setUser(data.user);
    return data.user;
  };

  const signOut = () => {
    localStorage.removeItem("nidhii_token");
    setUser(null);
  };

  const refresh = async () => {
    try {
      const r = await api.get("/auth/me");
      setUser(r.data);
    } catch (_) {/*ignore*/}
  };

  return (
    <AuthCtx.Provider value={{ user, loading, signIn, signUp, signOut, refresh }}>
      {children}
    </AuthCtx.Provider>
  );
}

export const useAuth = () => useContext(AuthCtx);
