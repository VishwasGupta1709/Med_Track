import Link from "next/link";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedTrack",
  description: "Medicine tracking and family health reminders",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <nav className="top-nav">
            <Link className="brand" href="/patients">
              MedTrack
            </Link>
            <Link className="nav-link" href="/patients/new">
              New patient
            </Link>
          </nav>
          {children}
        </div>
      </body>
    </html>
  );
}
