"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { gql } from "@apollo/client";
import { client } from "@/lib/graphql-client";
import { setToken, setAuth } from "@/lib/auth";

type AuthMode = "login" | "register" | "forgot";

interface AuthModalProps {
  open: boolean;
  mode: AuthMode;
  onClose: () => void;
  onModeChange: (mode: AuthMode) => void;
  onSuccess: () => void;
}

const REGISTER_MUTATION = gql`
  mutation Register($email: String!, $name: String!, $username: String!, $password: String!) {
    register(email: $email, name: $name, username: $username, password: $password)
  }
`;

const LOGIN_MUTATION = gql`
  mutation Login($emailOrUsername: String!, $password: String!) {
    login(emailOrUsername: $emailOrUsername, password: $password) {
      user { name email initials }
      token
    }
  }
`;

const FORGOT_PASSWORD_MUTATION = gql`
  mutation ForgotPassword($email: String!) {
    forgotPassword(email: $email)
  }
`;

const CHECK_EMAIL_QUERY = gql`
  query CheckEmail($email: String!) {
    checkEmail(email: $email)
  }
`;

const CHECK_USERNAME_QUERY = gql`
  query CheckUsername($username: String!) {
    checkUsername(username: $username)
  }
`;

function isValidEmail(v: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
}

function InputIcon({ status }: { status: string }) {
  if (status === "empty" || status === "checking") return null;
  if (status === "valid") {
    return <span className="text-lg leading-none" style={{ color: "#22c55e" }}>✓</span>;
  }
  return <span className="text-lg leading-none" style={{ color: "#ef4444" }}>✕</span>;
}

function InputWrapper({
  label,
  type,
  placeholder,
  value,
  onChange,
  status,
  showToggle,
  showPassword,
  onToggleVisibility,
}: {
  label: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  status: string;
  showToggle?: boolean;
  showPassword?: boolean;
  onToggleVisibility?: () => void;
}) {
  const inputType = showToggle && showPassword ? "text" : type;

  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: "#E5A985CC" }}>
        {label}
      </label>
      <div className="relative">
        <input
          type={inputType}
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-4 py-3 rounded-xl text-sm outline-none transition-all"
          style={{
            backgroundColor: "#2a2a2a",
            border: "1px solid rgba(229,169,133,0.25)",
            color: "#fff",
            paddingRight: showToggle ? "5.5rem" : "2.5rem",
          }}
          onFocus={(e) => e.target.style.borderColor = "#E5A985"}
          onBlur={(e) => e.target.style.borderColor = "rgba(229,169,133,0.25)"}
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {showToggle && (
            <button
              type="button"
              tabIndex={-1}
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={onToggleVisibility}
              className="pointer-events-auto text-lg leading-none transition-opacity hover:opacity-70"
              style={{ color: "#E5A98599" }}
            >
              {showPassword ? (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                  <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          )}
          <div className="pointer-events-none">
            <InputIcon status={status} />
          </div>
        </div>
      </div>
      {status === "too-short" && (
        <p className="text-xs mt-1" style={{ color: "#ef4444CC" }}>Minimum 3 characters</p>
      )}
      {status === "taken" && (
        <p className="text-xs mt-1" style={{ color: "#ef4444CC" }}>Already taken</p>
      )}
      {status === "invalid" && (
        <p className="text-xs mt-1" style={{ color: "#ef4444CC" }}>Invalid email format</p>
      )}
    </div>
  );
}

export default function AuthModal({ open, mode, onClose, onModeChange, onSuccess }: AuthModalProps) {
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regName, setRegName] = useState("");
  const [regUsername, setRegUsername] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [forgotSent, setForgotSent] = useState(false);

  const [regEmailStatus, setRegEmailStatus] = useState<string>("empty");
  const [regUsernameStatus, setRegUsernameStatus] = useState<string>("empty");
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [registered, setRegistered] = useState(false);

  const emailTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const usernameTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    if (!open) {
      setLoginEmail("");
      setLoginPassword("");
      setRegEmail("");
      setRegName("");
      setRegUsername("");
      setRegPassword("");
      setForgotEmail("");
      setError("");
      setForgotSent(false);
      setRegEmailStatus("empty");
      setRegUsernameStatus("empty");
      setRegistered(false);
    }
  }, [open]);

  // Debounced email check
  useEffect(() => {
    if (!regEmail) { setRegEmailStatus("empty"); return; }
    if (!isValidEmail(regEmail)) { setRegEmailStatus("invalid"); return; }

    setRegEmailStatus("checking");
    clearTimeout(emailTimer.current);
    emailTimer.current = setTimeout(async () => {
      try {
        const res = await client.query({ query: CHECK_EMAIL_QUERY, variables: { email: regEmail } });
        const d = res.data as { checkEmail: boolean };
        setRegEmailStatus(d.checkEmail ? "taken" : "valid");
      } catch {
        setRegEmailStatus("valid");
      }
    }, 400);

    return () => clearTimeout(emailTimer.current);
  }, [regEmail]);

  // Debounced username check
  useEffect(() => {
    if (!regUsername) { setRegUsernameStatus("empty"); return; }
    if (regUsername.length < 3) { setRegUsernameStatus("too-short"); return; }

    setRegUsernameStatus("checking");
    clearTimeout(usernameTimer.current);
    usernameTimer.current = setTimeout(async () => {
      try {
        const res = await client.query({ query: CHECK_USERNAME_QUERY, variables: { username: regUsername } });
        const d = res.data as { checkUsername: boolean };
        setRegUsernameStatus(d.checkUsername ? "taken" : "valid");
      } catch {
        setRegUsernameStatus("valid");
      }
    }, 400);

    return () => clearTimeout(usernameTimer.current);
  }, [regUsername]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  const handleRegister = async () => {
    setError("");
    if (!regEmail || !regName || !regUsername || !regPassword) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    try {
      await client.mutate({
        mutation: REGISTER_MUTATION,
        variables: { email: regEmail, name: regName, username: regUsername, password: regPassword },
      });
      setRegistered(true);
    } catch (err: any) {
      setError(err?.message || err?.graphQLErrors?.[0]?.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async () => {
    setError("");
    if (!loginEmail || !loginPassword) {
      setError("All fields are required");
      return;
    }
    setLoading(true);
    try {
      const res = await client.mutate({
        mutation: LOGIN_MUTATION,
        variables: { emailOrUsername: loginEmail, password: loginPassword },
      });
      const loginData = res.data as { login: { token: string; user: { name: string; email: string; initials: string } } };
      setToken(loginData.login.token);
      setAuth({ loggedIn: true, name: loginData.login.user.name, email: loginData.login.user.email, initials: loginData.login.user.initials });
      onSuccess();
    } catch (err: any) {
      setError(err?.message || err?.graphQLErrors?.[0]?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    setError("");
    if (!forgotEmail) {
      setError("Email is required");
      return;
    }
    setLoading(true);
    try {
      await client.mutate({
        mutation: FORGOT_PASSWORD_MUTATION,
        variables: { email: forgotEmail },
      });
      setForgotSent(true);
    } catch (err: any) {
      setError(err?.message || err?.graphQLErrors?.[0]?.message || "Failed to send recovery email");
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const renderContent = () => {
    switch (mode) {
      case "login":
        return (
          <>
            <h2 className="text-2xl font-semibold mb-1" style={{ color: "#E5A985" }}>Login</h2>
            <p className="text-sm mb-6" style={{ color: "#E5A985BB" }}>
              Enter your credentials to sign in.
            </p>
            {error && (
              <p className="text-xs mb-4 p-2 rounded-lg" style={{ backgroundColor: "#ef444422", color: "#ef4444" }}>{error}</p>
            )}
            <div className="mb-4">
              <InputWrapper
                label="Username or Email"
                type="text"
                placeholder="you@example.com"
                value={loginEmail}
                onChange={setLoginEmail}
                status={loginEmail ? (isValidEmail(loginEmail) || loginEmail.length >= 3 ? "valid" : "invalid") : "empty"}
              />
            </div>
            <div className="mb-5">
              <InputWrapper
                label="Password"
                type="password"
                placeholder="Enter your password"
                value={loginPassword}
                onChange={setLoginPassword}
                status={loginPassword ? "valid" : "empty"}
                showToggle
                showPassword={showLoginPassword}
                onToggleVisibility={() => setShowLoginPassword((p) => !p)}
              />
            </div>
            <button
              className="w-full py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#E5A985", color: "#1a1a1a" }}
              onClick={handleLogin}
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
            </button>
            <div className="flex items-center justify-between mt-6 text-xs">
              <button
                className="font-medium transition-opacity hover:opacity-80"
                style={{ color: "#E5A985" }}
                onClick={() => onModeChange("forgot")}
              >
                Forgot password?
              </button>
              <button
                className="font-medium transition-opacity hover:opacity-80"
                style={{ color: "#E5A985" }}
                onClick={() => onModeChange("register")}
              >
                New here? Register
              </button>
            </div>
          </>
        );

      case "register":
        return (
          <>
            <h2 className="text-2xl font-semibold mb-1" style={{ color: "#E5A985" }}>Create Account</h2>
            {registered ? (
              <>
                <p className="text-sm mb-3" style={{ color: "#22c55e" }}>
                  ✓ Account created! A verification link has been sent to <strong>{regEmail}</strong>.
                </p>
                <p className="text-xs mb-6" style={{ color: "#E5A985BB" }}>
                  Please check your email and click the link to verify your account, then log in.
                </p>
                <button
                  className="w-full py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#E5A985", color: "#1a1a1a" }}
                  onClick={() => { setRegistered(false); onModeChange("login"); }}
                >
                  Go to Login
                </button>
              </>
            ) : (
              <>
              <p className="text-sm mb-6" style={{ color: "#E5A985BB" }}>
                Create your account to start using Multiagent Research Automation Platform.
              </p>
            {error && (
              <p className="text-xs mb-4 p-2 rounded-lg" style={{ backgroundColor: "#ef444422", color: "#ef4444" }}>{error}</p>
            )}
            <div className="space-y-4">
              <InputWrapper
                label="Email"
                type="email"
                placeholder="you@example.com"
                value={regEmail}
                onChange={setRegEmail}
                status={regEmailStatus}
              />
              <InputWrapper
                label="Full Name"
                type="text"
                placeholder="Jane Doe"
                value={regName}
                onChange={setRegName}
                status={regName ? "valid" : "empty"}
              />
              <InputWrapper
                label="Username"
                type="text"
                placeholder="janedoe"
                value={regUsername}
                onChange={setRegUsername}
                status={regUsernameStatus}
              />
              <InputWrapper
                label="Password"
                type="password"
                placeholder="Create a password"
                value={regPassword}
                onChange={setRegPassword}
                status={regPassword ? "valid" : "empty"}
                showToggle
                showPassword={showRegPassword}
                onToggleVisibility={() => setShowRegPassword((p) => !p)}
              />
            </div>
            <button
              className="w-full py-3 rounded-full text-sm font-semibold mt-5 transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: "#E5A985", color: "#1a1a1a" }}
              onClick={handleRegister}
              disabled={loading}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
            <div className="text-center mt-6">
              <button
                className="text-xs font-medium transition-opacity hover:opacity-80"
                style={{ color: "#E5A985" }}
                onClick={() => onModeChange("login")}
              >
                Already have an account? Login
              </button>
            </div>
            </>
            )}
          </>
        );

      case "forgot":
        return (
          <>
            <h2 className="text-2xl font-semibold mb-1" style={{ color: "#E5A985" }}>Forgot Password</h2>
            {forgotSent ? (
              <>
                <p className="text-sm mb-6" style={{ color: "#22c55e" }}>
                  ✓ Recovery link sent! Check your email.
                </p>
                <button
                  className="w-full py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#E5A985", color: "#1a1a1a" }}
                  onClick={() => onModeChange("login")}
                >
                  Back to Login
                </button>
              </>
            ) : (
              <>
                <p className="text-sm mb-6" style={{ color: "#E5A985BB" }}>
                  Enter your email and we&apos;ll send you a secure recovery link.
                </p>
                {error && (
                  <p className="text-xs mb-4 p-2 rounded-lg" style={{ backgroundColor: "#ef444422", color: "#ef4444" }}>{error}</p>
                )}
                <div className="mb-5">
                  <InputWrapper
                    label="Email"
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={setForgotEmail}
                    status="empty"
                  />
                </div>
                <button
                  className="w-full py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                  style={{ backgroundColor: "#E5A985", color: "#1a1a1a" }}
                  onClick={handleForgotPassword}
                  disabled={loading}
                >
                  {loading ? "Sending..." : "Send Recovery Link"}
                </button>
                <div className="text-center mt-6">
                  <button
                    className="text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ color: "#E5A985" }}
                    onClick={() => onModeChange("login")}
                  >
                    Back to Login
                  </button>
                </div>
              </>
            )}
          </>
        );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-[460px] rounded-2xl p-6 md:p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
        style={{ backgroundColor: "#1a1a1a" }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          aria-label="Close modal"
          className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ color: "#E5A985", backgroundColor: "rgba(229,169,133,0.1)" }}
          onClick={onClose}
        >
          ✕
        </button>
        {renderContent()}
        <style jsx>{`
          input::placeholder {
            color: rgba(229, 169, 133, 0.35);
          }
        `}</style>
      </div>
    </div>
  );
}
