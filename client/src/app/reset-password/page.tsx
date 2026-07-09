"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { gql } from "@apollo/client";
import { client } from "@/lib/graphql-client";
import React from "react";

const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($token: String!, $newPassword: String!) {
    resetPassword(token: $token, newPassword: $newPassword) {
      user { name initials }
      token
    }
  }
`;

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"form" | "loading" | "success" | "error">("form");
  const [message, setMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) {
      setStatus("error");
      setMessage("No reset link provided.");
      return;
    }
    if (password.length < 6) {
      setMessage("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirm) {
      setMessage("Passwords do not match.");
      return;
    }
    setStatus("loading");
    try {
      await client.mutate({
        mutation: RESET_PASSWORD_MUTATION,
        variables: { token, newPassword: password },
      });
      setStatus("success");
    } catch (err: any) {
      setStatus("error");
      setMessage(
        err?.graphQLErrors?.[0]?.message ||
          err?.message ||
          "This link is invalid or has expired."
      );
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f4f1ed" }}>
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10">
          <h1 className="text-xl font-semibold mb-1 text-center" style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
            Reset Password
          </h1>

          {status === "form" && (
            <>
              <p className="text-center mb-6 text-sm" style={{ fontFamily: "Georgia, serif", color: "#666" }}>
                Enter your new password.
              </p>
              {message && (
                <p className="text-xs mb-4 p-2 rounded-lg text-center" style={{ backgroundColor: "#ef444422", color: "#ef4444" }}>{message}</p>
              )}
              <form onSubmit={handleSubmit} className="space-y-4">
                <input
                  type="password"
                  placeholder="New password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#ddd", color: "#1a1a1a" }}
                />
                <input
                  type="password"
                  placeholder="Confirm password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl text-sm border outline-none"
                  style={{ borderColor: "#ddd", color: "#1a1a1a" }}
                />
                <button
                  type="submit"
                  className="w-full py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "#1a1a1a", color: "#fff" }}
                >
                  Reset Password
                </button>
              </form>
            </>
          )}

          {status === "loading" && (
            <div className="text-center py-8">
              <div className="w-12 h-12 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
              <p style={{ fontFamily: "Georgia, serif", color: "#666" }}>Resetting password…</p>
            </div>
          )}

          {status === "success" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl" style={{ color: "#22c55e" }}>✓</span>
              </div>
              <p className="mb-7" style={{ fontFamily: "Georgia, serif", color: "#666", lineHeight: 1.6 }}>
                Your password has been reset. You can now log in with your new password.
              </p>
              <Link
                href="/"
                className="inline-block px-7 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1a1a1a", color: "#fff" }}
              >
                Go to Login
              </Link>
            </div>
          )}

          {status === "error" && (
            <div className="text-center py-4">
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl" style={{ color: "#ef4444" }}>✕</span>
              </div>
              <p className="mb-7" style={{ fontFamily: "Georgia, serif", color: "#666", lineHeight: 1.6 }}>
                {message}
              </p>
              <Link
                href="/"
                className="inline-block px-7 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1a1a1a", color: "#fff" }}
              >
                Back to Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f4f1ed" }}>
          <p style={{ fontFamily: "Georgia, serif", color: "#888" }}>Loading…</p>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
