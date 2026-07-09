"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { gql } from "@apollo/client";
import { client } from "@/lib/graphql-client";
import { setToken, setAuth } from "@/lib/auth";

const VERIFY_MAGIC_LINK_MUTATION = gql`
  mutation VerifyMagicLink($token: String!) {
    verifyMagicLink(token: $token) {
      user { name email initials }
      token
    }
  }
`;

function AuthCallbackContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("No sign-in link provided.");
      return;
    }

    client
      .mutate({ mutation: VERIFY_MAGIC_LINK_MUTATION, variables: { token } })
      .then((res) => {
        const data = res.data as { verifyMagicLink: { user: { name: string; email: string; initials: string }; token: string } };
        setToken(data.verifyMagicLink.token);
        setAuth({ loggedIn: true, name: data.verifyMagicLink.user.name, email: data.verifyMagicLink.user.email, initials: data.verifyMagicLink.user.initials });
        window.location.href = "/";
      })
      .catch((err) => {
        setStatus("error");
        setMessage(
          err?.graphQLErrors?.[0]?.message ||
            err?.message ||
            "This link is invalid or has expired."
        );
      });
  }, [token]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f4f1ed" }}>
      <div className="max-w-md w-full mx-4">
        <div className="bg-white rounded-2xl shadow-lg p-8 md:p-10 text-center">
          {status === "loading" && (
            <>
              <div className="w-12 h-12 border-2 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mx-auto mb-5" />
              <h1 className="text-xl font-semibold mb-2" style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
                Signing you in…
              </h1>
            </>
          )}

          {status === "error" && (
            <>
              <div className="w-14 h-14 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-5">
                <span className="text-2xl" style={{ color: "#ef4444" }}>✕</span>
              </div>
              <h1 className="text-xl font-semibold mb-2" style={{ fontFamily: "Georgia, serif", color: "#1a1a1a" }}>
                Invalid Link
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
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "#f4f1ed" }}>
          <p style={{ fontFamily: "Georgia, serif", color: "#888" }}>Loading…</p>
        </div>
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
