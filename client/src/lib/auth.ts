import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { gql } from "@apollo/client";
import { client } from "./graphql-client";

const AUTH_KEY = "deepResearchAuth";
const TOKEN_KEY = "deepResearchToken";

export interface AuthUser {
  loggedIn: boolean;
  name: string;
  email: string;
  initials: string;
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export function getAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem(AUTH_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored) as AuthUser;
  } catch {
    return null;
  }
}

export function setAuth(user: AuthUser) {
  localStorage.setItem(AUTH_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(AUTH_KEY);
  localStorage.removeItem(TOKEN_KEY);
}

const ME_QUERY = gql`
  query Me {
    me {
      id
      name
      email
      initials
    }
  }
`;

export async function validateToken(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;

  try {
    const res = await client.query({ query: ME_QUERY });
    const meData = res.data as { me: { name: string; email: string; initials: string } | null };
    if (meData?.me) {
      const user: AuthUser = {
        loggedIn: true,
        name: meData.me.name,
        email: meData.me.email,
        initials: meData.me.initials,
      };
      setAuth(user);
      return user;
    }
  } catch {
    clearAuth();
  }
  return null;
}

export function useAuthRedirect() {
  const router = useRouter();
  useEffect(() => {
    const auth = getAuth();
    if (auth?.loggedIn) {
      if (window.location.pathname === "/") {
        router.push("/dashboard");
      }
    } else {
      const protectedPaths = ["/dashboard", "/settings", "/chat"];
      if (protectedPaths.some((p) => window.location.pathname.startsWith(p))) {
        router.push("/");
      }
    }
  }, [router]);
}
