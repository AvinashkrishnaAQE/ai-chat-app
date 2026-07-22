"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, isBootstrapped } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (isBootstrapped && !user) {
      router.replace("/login");
    }
  }, [isBootstrapped, user, router]);

  if (!user) return null;
  return <>{children}</>;
}