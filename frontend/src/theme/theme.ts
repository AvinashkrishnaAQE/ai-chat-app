import { createTheme, ThemeOptions } from "@mui/material/styles";

const shared: Partial<ThemeOptions> = {
  typography: {
    fontFamily: '"Inter", -apple-system, sans-serif',
    button: { textTransform: "none", fontWeight: 600 },
  },
  shape: { borderRadius: 10 },
};

export const lightTheme = createTheme({
  ...shared,
  palette: {
    mode: "light",
    background: { default: "#F7F7F5", paper: "#FFFFFF" },
    text: { primary: "#1B1D22", secondary: "#6B6F76" },
    primary: { main: "#C9822E" },
    divider: "#E5E4E0",
  },
});

export const darkTheme = createTheme({
  ...shared,
  palette: {
    mode: "dark",
    background: { default: "#15171C", paper: "#1D2027" },
    text: { primary: "#E8E9ED", secondary: "#9A9DA6" },
    primary: { main: "#D98E3F" },
    divider: "#2A2D35",
  },
});