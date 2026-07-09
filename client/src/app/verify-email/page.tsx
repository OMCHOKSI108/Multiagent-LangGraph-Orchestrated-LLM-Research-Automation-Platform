"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { gql } from "@apollo/client";
import { client } from "@/lib/graphql-client";

const VERIFY_EMAIL_MUTATION = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`;

function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No verification token provided.");
      return;
    }

    client
      .mutate({ mutation: VERIFY_EMAIL_MUTATION, variables: { token } })
      .then(() => {
        setStatus("success");
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err?.graphQLErrors?.[0]?.message ||
            err?.message ||
            "Verification failed. The link may have expired."
        );
      });
  }, [token]);

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "#f4f1ed" }}
    >
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 text-center">
          {status === "loading" && (
            <>
              <div className="w-12 h-12 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
              <h1 className="text-xl font-semibold mb-2" style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
                Verifying your email…
              </h1>
              <p style={{ fontFamily: "Georgia, serif", color: "#666" }}>Please wait a moment.</p>
            </>
          )}

          {status === "success" && (
            <>
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl" style={{ color: "#22c55e" }}>✓</span>
              </div>
              <h1 className="text-xl font-semibold mb-2" style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
                Email Verified
              </h1>
              <p className="mb-7" style={{ fontFamily: "Georgia, serif", color: "#666", lineHeight: 1.6 }}>
                Your email has been successfully verified. You can now log in to your account.
              </p>
              <Link
                href="/"
                className="inline-block px-7 py-3 rounded-full text-sm font-semibold transition-opacity hover:opacity-90"
                style={{ backgroundColor: "#1a1a1a", color: "#fff" }}
              >
                Go to Login
              </Link>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl" style={{ color: "#ef4444" }}>✕</span>
              </div>
              <h1 className="text-xl font-semibold mb-2" style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
                Verification Failed
              </h1>
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
            </>
          )}
        </div>

        <p className="text-center mt-6 text-sm" style={{ color: "#888", fontFamily: "Georgia, serif" }}>
          Multiagent Research Automation Platform
        </p>
      </div>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ backgroundColor: "#f4f1ed" }}
        >
          <p style={{ fontFamily: "Georgia, serif", color: "#888" }}>Loading…</p>
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
