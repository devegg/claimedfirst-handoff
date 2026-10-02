import type { Metadata } from "next";
import { Fraunces, DM_Sans } from "next/font/google";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import "./globals.css";

const fraunces = Fraunces({ variable: "--font-fraunces", subsets: ["latin"], display: "swap" });
const dmSans = DM_Sans({ variable: "--font-dm-sans", subsets: ["latin"], display: "swap" });

const DESCRIPTION = "Find AI music artists before everyone else, and keep the number.";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.claimedfirst.com"),
  title: { default: "ClaimedFirst", template: "%s · ClaimedFirst" },
  description: DESCRIPTION,
  openGraph: { type: "website", siteName: "ClaimedFirst", title: "ClaimedFirst", description: DESCRIPTION },
  twitter: { card: "summary_large_image", title: "ClaimedFirst", description: DESCRIPTION },
  // Private trial: keep the site out of search results. Remove these two lines (and robots.ts and the header in next.config.ts) to launch.
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${fraunces.variable} ${dmSans.variable}`}>
      <body>
        <SiteHeader />
        {children}
        <footer className="site-footer">
          <div className="wrap">
            <span>Independent. No affiliation with Suno, YouTube or any other service.</span>
            <nav aria-label="Footer"><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/guide">Guide</Link></nav>
          </div>
        </footer>
      </body>
    </html>
  );
}
