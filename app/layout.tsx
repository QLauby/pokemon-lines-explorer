import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Github } from "lucide-react";
import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const robotoMono = Roboto_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Pokemon Lines Explorer",
  description: "Explore Pokemon lines and battle possibilities",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${robotoMono.variable} antialiased min-h-screen flex flex-col`}
      >
        <TooltipProvider>
            <main className="flex-grow">
                {children}
            </main>
            <footer className="w-full border-t border-border/40 py-6 mt-12 bg-background/50 backdrop-blur-sm">
                <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
                    <p>© {new Date().getFullYear()} Pokemon Lines Explorer. Created by LeQdu94.</p>
                    <div className="flex items-center gap-6">
                        <a 
                            href="https://github.com/QLauby/pokemon-lines-explorer" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 hover:text-foreground transition-colors"
                        >
                            <Github className="w-4 h-4" />
                            Source Code
                        </a>
                        <a 
                            href="https://github.com/QLauby/pokemon-lines-explorer/issues" 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-foreground transition-colors"
                        >
                            Report a bug
                        </a>
                    </div>
                </div>
            </footer>
        </TooltipProvider>
        <Toaster />
      </body>
    </html>
  );
}
