"use client";

import { useEffect, useRef } from "react";
import { Box } from "@mui/material";
import MessageBubble from "./MessageBubble";
import type { Message } from "@/lib/api/chat";

interface Props {
  messages: Message[];
  streamingContent?: string;
}

export default function MessageList({ messages, streamingContent }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, streamingContent]);

  return (
    <Box sx={{ flex: 1, overflowY: "auto" }}>
      <Box sx={{ maxWidth: 760, mx: "auto", px: 3, py: 3 }}>
        {messages.map((m) => (
          <MessageBubble key={m.id} message={m} />
        ))}
        {streamingContent !== undefined && (
          <MessageBubble
            message={{
              id: "streaming",
              role: "assistant",
              content: streamingContent || "...",
              model: null,
              created_at: new Date().toISOString(),
            }}
          />
        )}
        <div ref={bottomRef} />
      </Box>
    </Box>
  );
}