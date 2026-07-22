"use client";

import { Box, CircularProgress, Alert, Typography } from "@mui/material";
import { useChatStore } from "@/store/useChatStore";
import MessageList from "./MessageList";
import Composer from "./Composer";
import QuickPrompts from "./QuickPrompts";

export default function ChatWindow() {
  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const messagesByConversation = useChatStore((s) => s.messagesByConversation);
  const loadingMessages = useChatStore((s) => s.loadingMessages);
  const streamingContent = useChatStore((s) => s.streamingContent);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const connectionError = useChatStore((s) => s.connectionError);

  if (!activeConversationId) {
    return (
      <Box
        sx={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          px: 2,
        }}
      >
        <Typography variant="h4" fontWeight={500} color="text.primary" sx={{ mb: 4 }}>
          What can I help with?
        </Typography>
        <Box sx={{ width: "100%", maxWidth: 760 }}>
          <Composer variant="landing" placeholder="How can I help you today?" />
        </Box>
        <QuickPrompts />
      </Box>
    );
  }

  const messages = messagesByConversation[activeConversationId];

  return (
    <Box sx={{ flex: 1, display: "flex", flexDirection: "column", height: "100vh" }}>
      {connectionStatus === "reconnecting" && (
        <Alert severity="warning" sx={{ borderRadius: 0 }}>
          Reconnecting...
        </Alert>
      )}
      {connectionError && (
        <Alert severity="error" sx={{ borderRadius: 0 }}>
          {connectionError}
        </Alert>
      )}

      {loadingMessages && !messages ? (
        <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <CircularProgress size={28} />
        </Box>
      ) : (
        <MessageList messages={messages ?? []} streamingContent={isStreaming ? streamingContent : undefined} />
      )}
      <Box sx={{ p: 2, borderTop: "1px solid", borderColor: "divider" }}>
        <Composer />
      </Box>
    </Box>
  );
}