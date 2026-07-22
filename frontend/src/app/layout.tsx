import type { Metadata } from "next";
import ThemeRegistry from "@/theme/ThemeRegistry";
import AuthProvider from "@/components/auth/AuthProvider";

export const metadata: Metadata = {
  title: "AI Chat App",
  description: "ChatGPT-style conversational interface",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0 }}>
        <ThemeRegistry>
          <AuthProvider>{children}</AuthProvider>
        </ThemeRegistry>
      </body>
    </html>
  );
}