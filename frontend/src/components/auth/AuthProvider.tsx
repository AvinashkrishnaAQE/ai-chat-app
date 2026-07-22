"use client";

import { useEffect } from "react";
import { Box, CircularProgress } from "@mui/material";
import { useAuthStore } from "@/store/useAuthStore";
import { tryRefresh } from "@/lib/api/client";

export default function AuthProvider({ children }: { children: React.ReactNode }) {
  const isBootstrapped = useAuthStore((s) => s.isBootstrapped);
  const setBootstrapped = useAuthStore((s) => s.setBootstrapped);

  useEffect(() => {
    tryRefresh().finally(() => setBootstrapped());
  }, [setBootstrapped]);

  if (!isBootstrapped) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  return <>{children}</>;
}



