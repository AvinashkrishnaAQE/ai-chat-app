"use client";

import { KeyboardEvent } from "react";
import { Box, IconButton, InputBase } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import { useChatStore } from "@/store/useChatStore";
import ModelPicker from "./ModelPicker";

interface Props {
  variant?: "docked" | "landing";
  placeholder?: string;
}

export default function Composer({ variant = "docked", placeholder }: Props) {
  const draftInput = useChatStore((s) => s.draftInput);
  const setDraftInput = useChatStore((s) => s.setDraftInput);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const startNewConversation = useChatStore((s) => s.startNewConversation);
  const connectionStatus = useChatStore((s) => s.connectionStatus);
  const isStreaming = useChatStore((s) => s.isStreaming);
  const activeConversationId = useChatStore((s) => s.activeConversationId);

  const isLanding = variant === "landing";

  const canSend =
    draftInput.trim().length > 0 &&
    !isStreaming &&
    (isLanding || connectionStatus === "open");

  const submit = () => {
    if (!canSend) return;
    const content = draftInput.trim();
    if (!activeConversationId) {
      startNewConversation(content);
    } else {
      sendMessage(content);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const resolvedPlaceholder =
    placeholder ??
    (connectionStatus === "connecting" || connectionStatus === "reconnecting"
      ? "Connecting..."
      : connectionStatus === "error"
      ? "Connection lost — reload to retry"
      : "Message the assistant...");

  return (
    <Box
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        bgcolor: "background.paper",
        maxWidth: 760,
        width: "100%",
        mx: "auto",
        overflow: "hidden",
        boxShadow: isLanding ? 2 : "none",
      }}
    >
      <InputBase
        value={draftInput}
        onChange={(e) => setDraftInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={resolvedPlaceholder}
        disabled={!isLanding && connectionStatus === "error"}
        multiline
        maxRows={6}
        fullWidth
        autoFocus={isLanding}
        sx={{ px: 2, pt: isLanding ? 2 : 1.5, pb: 0.5, fontSize: isLanding ? "1rem" : "0.9375rem" }}
      />
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", px: 1, pb: 1 }}>
        <ModelPicker />
        <IconButton
          onClick={submit}
          disabled={!canSend}
          sx={{
            bgcolor: "primary.main",
            color: "#fff",
            "&:hover": { bgcolor: "primary.dark" },
            "&.Mui-disabled": { bgcolor: "action.disabledBackground" },
          }}
          size="small"
        >
          <ArrowUpwardIcon fontSize="small" />
        </IconButton>
      </Box>
    </Box>
  );
}