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

  // If not authenticated, only allow /login (but layout still renders minimal shell)
  if (!user) {
    // You could redirect here, but better to let /login handle it
    // We'll render a minimal layout that doesn't show sidebar/navbar
    return (
      <html lang="en">
        <body
          className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        >
          {children}
        </body>
      </html>
    );
  }

  // Fetch profile
  const { data: profile } = await supabaseServer
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Optional: redirect to onboarding
    redirect("/onboarding");
  }

  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {/* Pass user + profile to a CLIENT component that handles interactivity */}
        <LayoutClient user={user} profile={profile}>
          {children}
        </LayoutClient>
      </body>
    </html>
  );
}
