import { Box, Typography } from "@mui/material";

export default function EmptyState() {
  return (
    <Box sx={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
      <Typography variant="h6" color="text.secondary" fontWeight={500}>
        What can I help with?
      </Typography>
    </Box>
  );
}