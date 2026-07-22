"use client";

import { useEffect, useState } from "react";
import { Box, IconButton, Stack, Typography, InputBase, Avatar } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import DeleteOutlineOutlinedIcon from "@mui/icons-material/DeleteOutlineOutlined";
import LogoutIcon from "@mui/icons-material/Logout";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/store/useChatStore";
import { useAuthStore } from "@/store/useAuthStore";
import { logoutRequest } from "@/lib/api/auth";
import ThemeToggle from "@/components/common/ThemeToggle";

export default function Sidebar() {
  const conversations = useChatStore((s) => s.conversations);
  const activeConversationId = useChatStore((s) => s.activeConversationId);
const startNewConversation = useChatStore((s) => s.startNewConversation);
  const selectConversation = useChatStore((s) => s.selectConversation);
  const deleteConversation = useChatStore((s) => s.deleteConversation);
  const loadConversations = useChatStore((s) => s.loadConversations);

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    if (user) loadConversations();
  }, [user, loadConversations]);

  const handleLogout = async () => {
    await logoutRequest();
    clearAuth();
    router.push("/login");
  };

  const handleDelete = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    deleteConversation(id);
  };

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const initial = user?.email?.[0]?.toUpperCase() ?? "?";

  return (
    <Box
      sx={{
        width: 260,
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        borderRight: "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
      }}
    >
      <Box sx={{ px: 2, pt: 2, pb: 1 }}>
        <Typography variant="subtitle1" fontWeight={700} color="text.primary">
          CusT
        </Typography>
      </Box>

      <Box sx={{ px: 1.5, pb: 1 }}>
        <Box
onClick={() => startNewConversation()}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1,
            py: 1,
            borderRadius: 1,
            cursor: "pointer",
            color: "text.primary",
            "&:hover": { bgcolor: "action.hover" },
          }}
        >
          <AddIcon fontSize="small" />
          <Typography variant="body2" fontWeight={500}>
            New chat
          </Typography>
        </Box>

        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
            px: 1,
            py: 0.75,
            borderRadius: 1,
            mt: 0.5,
          }}
        >
          <SearchIcon fontSize="small" sx={{ color: "text.secondary" }} />
          <InputBase
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            sx={{ fontSize: "0.875rem", flex: 1, color: "text.primary" }}
          />
        </Box>
      </Box>

      <Typography
        variant="caption"
        sx={{ px: 2, pt: 1, pb: 0.5, color: "text.secondary", fontWeight: 600 }}
      >
        Recents
      </Typography>

      <Stack sx={{ flex: 1, overflowY: "auto", px: 1 }} spacing={0.5}>
        {filteredConversations.length === 0 ? (
          <Typography variant="body2" sx={{ px: 1.5, py: 1, color: "text.secondary" }}>
            {searchQuery ? "No matching chats" : "No conversations yet"}
          </Typography>
        ) : (
          filteredConversations.map((c) => {
            const active = c.id === activeConversationId;
            return (
              <Box
                key={c.id}
                onClick={() => selectConversation(c.id)}
                sx={{
                  px: 1.5,
                  py: 1,
                  borderRadius: 1,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderLeft: active ? "3px solid" : "3px solid transparent",
                  borderLeftColor: active ? "primary.main" : "transparent",
                  bgcolor: active ? "action.selected" : "transparent",
                  "&:hover": { bgcolor: "action.hover" },
                  "&:hover .delete-btn": { opacity: 1 },
                }}
              >
                <Typography variant="body2" noWrap color="text.primary" sx={{ flex: 1 }}>
                  {c.title}
                </Typography>
                <IconButton
                  className="delete-btn"
                  size="small"
                  onClick={(e) => handleDelete(e, c.id)}
                  sx={{ opacity: 0, transition: "opacity 0.15s" }}
                >
                  <DeleteOutlineOutlinedIcon fontSize="small" />
                </IconButton>
              </Box>
            );
          })
        )}
      </Stack>

      <Box
        sx={{
          p: 1.5,
          borderTop: "1px solid",
          borderColor: "divider",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <Avatar sx={{ width: 28, height: 28, fontSize: "0.8125rem", bgcolor: "primary.main" }}>
            {initial}
          </Avatar>
          <Typography variant="body2" color="text.primary" noWrap sx={{ maxWidth: 120 }}>
            {user?.email}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={0.5}>
          <ThemeToggle />
          <IconButton size="small" onClick={handleLogout} sx={{ color: "text.secondary" }}>
            <LogoutIcon fontSize="small" />
          </IconButton>
        </Stack>
      </Box>
    </Box>
  );
}