"use client";

import { Stack, Chip } from "@mui/material";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import SchoolOutlinedIcon from "@mui/icons-material/SchoolOutlined";
import CodeIcon from "@mui/icons-material/Code";
import LightbulbOutlinedIcon from "@mui/icons-material/LightbulbOutlined";
import { useChatStore } from "@/store/useChatStore";

const PROMPTS = [
  { label: "Write", icon: <EditOutlinedIcon fontSize="small" />, text: "Help me write " },
  { label: "Learn", icon: <SchoolOutlinedIcon fontSize="small" />, text: "Explain " },
  { label: "Code", icon: <CodeIcon fontSize="small" />, text: "Help me write code that " },
  { label: "Ideas", icon: <LightbulbOutlinedIcon fontSize="small" />, text: "Give me ideas for " },
];

export default function QuickPrompts() {
  const setDraftInput = useChatStore((s) => s.setDraftInput);

  return (
    <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center" sx={{ mt: 3 }}>
      {PROMPTS.map((p) => (
        <Chip
          key={p.label}
          icon={p.icon}
          label={p.label}
          variant="outlined"
          onClick={() => setDraftInput(p.text)}
          sx={{ borderColor: "divider", color: "text.primary" }}
        />
      ))}
    </Stack>
  );
}