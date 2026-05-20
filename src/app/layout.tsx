import Link from "next/link";
import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
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
        <ClerkProvider>
          <div className="app-shell">
            <nav className="top-nav">
              <Link className="brand" href="/">
                MedTrack
              </Link>
              <div className="nav-links">
                <Link className="nav-link" href="/">
                  Dashboard
                </Link>
                <Link className="nav-link" href="/patients/new">
                  New patient
                </Link>
                <Show when="signed-out">
                  <SignInButton>
                    <button className="nav-link" type="button">
                      Sign in
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="primary-button" type="button">
                      Sign up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <UserButton />
                </Show>
              </div>
            </nav>
            {children}
          </div>
        </ClerkProvider>
      </body>
    </html>
  );
}
