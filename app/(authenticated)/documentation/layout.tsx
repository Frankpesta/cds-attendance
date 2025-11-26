"use client";

import { useEffect, useState } from "react";
import { getSessionAction } from "@/app/actions/session";

export default function DocumentationLayout({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<"loading" | "ready" | "denied">("loading");

  useEffect(() => {
    (async () => {
      const session = await getSessionAction();
      if (!session || !["admin", "super_admin"].includes(session.user.role)) {
        setStatus("denied");
        if (typeof window !== "undefined") {
          window.location.href = "/dashboard";
        }
        return;
      }
      setStatus("ready");
    })();
  }, []);

  if (status === "loading") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary" />
      </div>
    );
  }

  if (status === "denied") {
    return null;
  }

  return <div className="space-y-6">{children}</div>;
}
