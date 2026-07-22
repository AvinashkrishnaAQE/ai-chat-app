"use client";

import { Box } from "@mui/material";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark, oneLight } from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "@mui/material/styles";
import type { Message } from "@/lib/api/chat";

export default function MessageBubble({ message }: { message: Message }) {
  const theme = useTheme();
  const isUser = message.role === "user";

  const markdownSx = {
    "& p": { margin: 0, marginBottom: "0.75em" },
    "& p:last-child": { marginBottom: 0 },
    "& ul, & ol": { margin: "0.5em 0", paddingLeft: "1.5em" },
    "& li": { marginBottom: "0.25em" },
    "& pre": { margin: "0.75em 0", borderRadius: 1, overflow: "auto" },
    "& code:not(pre code)": {
      bgcolor: "action.hover",
      px: 0.6,
      py: 0.1,
      borderRadius: 0.5,
      fontSize: "0.875em",
    },
    "& h1, & h2, & h3": { marginTop: "0.75em", marginBottom: "0.5em" },
  };

  if (isUser) {
    return (
      <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 3 }}>
        <Box
          sx={{
            maxWidth: "70%",
            px: 2,
            py: 1.25,
            borderRadius: 4,
            bgcolor: "primary.main",
            color: "#fff",
            ...markdownSx,
          }}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{message.content}</ReactMarkdown>
        </Box>
      </Box>
    );
  }

  return (
    <Box sx={{ mb: 3, color: "text.primary", ...markdownSx }}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || "");
            return match ? (
              <SyntaxHighlighter
                style={theme.palette.mode === "dark" ? oneDark : oneLight}
                language={match[1]}
                PreTag="div"
              >
                {String(children).replace(/\n$/, "")}
              </SyntaxHighlighter>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
        }}
      >
        {message.content}
      </ReactMarkdown>
    </Box>
  );
}