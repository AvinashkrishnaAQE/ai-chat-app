"use client";

import { useEffect, useState, MouseEvent } from "react";
import { Button, Menu, MenuItem, ListItemText } from "@mui/material";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import { useChatStore } from "@/store/useChatStore";

export default function ModelPicker() {
  const availableModels = useChatStore((s) => s.availableModels);
  const selectedModel = useChatStore((s) => s.selectedModel);
  const setSelectedModel = useChatStore((s) => s.setSelectedModel);
  const loadModels = useChatStore((s) => s.loadModels);
  const isStreaming = useChatStore((s) => s.isStreaming);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    loadModels();
  }, [loadModels]);

  if (availableModels.length === 0) return null;

  const currentLabel =
    availableModels.find((m) => m.id === selectedModel)?.label ?? availableModels[0].label;

  const handleOpen = (e: MouseEvent<HTMLElement>) => setAnchorEl(e.currentTarget);
  const handleClose = () => setAnchorEl(null);
  const handleSelect = (modelId: string) => {
    setSelectedModel(modelId);
    handleClose();
  };

  return (
    <>
      <Button
        onClick={handleOpen}
        disabled={isStreaming}
        endIcon={<KeyboardArrowDownIcon sx={{ fontSize: 16 }} />}
        sx={{
          color: "text.secondary",
          fontSize: "0.8125rem",
          fontWeight: 500,
          textTransform: "none",
          px: 1,
          minWidth: 0,
          "&:hover": { bgcolor: "action.hover" },
        }}
      >
        {currentLabel}
      </Button>
      <Menu anchorEl={anchorEl} open={open} onClose={handleClose}>
        {availableModels.map((m) => (
          <MenuItem
            key={m.id}
            selected={m.id === selectedModel}
            onClick={() => handleSelect(m.id)}
            sx={{ fontSize: "0.875rem" }}
          >
            <ListItemText>{m.label}</ListItemText>
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}