import type { Metadata } from "next";
import "./globals.css";
import Navigation from "@/components/Navigation";
import AuthSync from "@/components/AuthSync";
import { Toaster } from "react-hot-toast";

export const metadata: Metadata = {
  title: "GrowthOS -- X Content Operating System",
  description: "AI-powered X growth platform. Compose, schedule, and analyze your content.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className="antialiased"
        style={{ background: "var(--bg-base)", color: "var(--text-primary)" }}
      >
        <AuthSync />
        <Navigation />

        {/* Main content area -- offset by sidebar on desktop, padded for bottom nav on mobile */}
        <main className="min-h-screen lg:ml-[240px] pb-24 lg:pb-8">
          {children}
        </main>

        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background: "#161625",
              color: "#f1f5f9",
              border: "1px solid #2a2a45",
              borderRadius: "12px",
              fontSize: "13px",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
            },
            success: {
              iconTheme: { primary: "#10b981", secondary: "#161625" },
            },
            error: {
              iconTheme: { primary: "#ef4444", secondary: "#161625" },
            },
          }}
        />
      </body>
    </html>
  );
}
