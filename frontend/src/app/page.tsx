"use client";

import { Box } from "@mui/material";
import Sidebar from "@/components/sidebar/Sidebar";
import ChatWindow from "@/components/chat/ChatWindow";
import ProtectedRoute from "@/components/auth/ProtectedRoute";

export default function Home() {
  return (
    <ProtectedRoute>
      <Box sx={{ display: "flex" }}>
        <Sidebar />
        <ChatWindow />
      </Box>
    </ProtectedRoute>
  );
}