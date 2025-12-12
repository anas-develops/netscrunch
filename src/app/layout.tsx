import { Geist, Geist_Mono } from "next/font/google";
import { redirect } from "next/navigation";
import { LayoutClient } from "./layoutClient";
import "./globals.css";
import { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NetScrunch by Netpace",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabaseServer = await createClient();
  const {
    data: { user },
  } = await supabaseServer.auth.getUser();

  // Fetch profile
  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("full_name, role")
    .eq("id", user?.id)
    .single();

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Pass user + profile to a CLIENT component that handles interactivity */}
        {user && profile ? (
          <LayoutClient user={user} profile={profile}>
            {children}
          </LayoutClient>
        ) : (
          <>{children}</>
        )}
      </body>
    </html>
  );
}
