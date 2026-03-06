
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowRight, Zap, Cog, Terminal, ShieldCheck } from 'lucide-react';
import Image from 'next/image';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background/95 backdrop-blur-md z-50">
        <Link href="/" className="flex items-center justify-center">
          <Zap className="h-6 w-6 text-primary" />
          <span className="ml-2 text-xl font-semibold text-foreground">Anita Deploy</span>
        </Link>
        <nav className="ml-auto flex gap-4 sm:gap-6">
          <Button variant="outline" asChild>
            <Link href="/login">Login</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Sign Up <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        </nav>
      </header>

      <main className="flex-1">
        <section className="w-full py-20 md:py-28 lg:py-36 bg-gradient-to-br from-background via-secondary/70 to-background">
          <div className="container px-4 md:px-6">
            <div className="grid gap-10 lg:grid-cols-[1fr_500px] lg:gap-16 xl:grid-cols-[1fr_600px]">
              <div className="flex flex-col justify-center space-y-8">
                <div className="space-y-4">
                  <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl xl:text-7xl/none bg-clip-text text-transparent bg-gradient-to-r from-primary to-accent">
                    Deploy Anita-V5 Bot in Minutes
                  </h1>
                  <p className="max-w-[600px] text-muted-foreground md:text-xl">
                    Anita Deploy simplifies the process of deploying your own Anita-V5 WhatsApp bot.
                    Configure your environment, connect to your deployment platform, and go live effortlessly.
                  </p>
                </div>
                <div className="flex flex-col gap-3 min-[400px]:flex-row">
                  <Button size="lg" asChild className="shadow-lg hover:shadow-primary/30 transform hover:scale-105 transition-all duration-300">
                    <Link href="/dashboard">
                      Get Started
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Link>
                  </Button>
                  <Button variant="secondary" size="lg" asChild className="shadow-md hover:shadow-lg transform hover:scale-105 transition-all duration-300">
                    <Link href="https://github.com/DavidCyrilTech/Anita-V5" target="_blank" rel="noopener noreferrer">
                      View on GitHub
                    </Link>
                  </Button>
                </div>
              </div>
              <Image
                src="https://camo.githubusercontent.com/f4625823634c4e349a23272ed5d46a3abc569c3676ea3b6ba43c17db1a57e67f/68747470733a2f2f66696c65732e636174626f782e6d6f652f306c793068362e6a7067"
                alt="Queen Anita V5 Bot"
                data-ai-hint="chatbot ai"
                width={600}
                height={400}
                className="mx-auto aspect-video overflow-hidden rounded-xl object-contain sm:w-full lg:order-last shadow-2xl border-2 border-primary/20"
                priority
              />
            </div>
          </div>
        </section>

        <section className="w-full py-16 md:py-24 lg:py-32 bg-background">
          <div className="container px-4 md:px-6">
            <div className="flex flex-col items-center justify-center space-y-4 text-center">
              <div className="space-y-2">
                <div className="inline-block rounded-lg bg-primary/10 px-4 py-2 text-sm font-semibold text-primary shadow-sm">Key Features</div>
                <h2 className="text-4xl font-bold tracking-tight sm:text-5xl text-foreground">Everything You Need to Deploy</h2>
                <p className="max-w-[900px] text-muted-foreground md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed">
                  From easy configuration to AI-powered debugging, Anita Deploy provides a seamless experience.
                </p>
              </div>
            </div>
            <div className="mx-auto grid max-w-5xl items-start gap-10 sm:grid-cols-2 md:gap-12 lg:grid-cols-3 lg:gap-16 mt-16">
              <div className="flex flex-col items-center text-center p-8 rounded-xl border bg-card shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:border-primary/50 transform hover:-translate-y-2">
                <div className="p-4 rounded-full bg-primary/10 mb-6 shadow-md">
                  <Cog className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-foreground">Easy Configuration</h3>
                <p className="text-sm text-muted-foreground">
                  Simple form to set up all your Anita-V4 environment variables.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-8 rounded-xl border bg-card shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:border-primary/50 transform hover:-translate-y-2">
                <div className="p-4 rounded-full bg-primary/10 mb-6 shadow-md">
                 <ShieldCheck className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-foreground">Secure Platform</h3>
                <p className="text-sm text-muted-foreground">
                  One-click deployment to your chosen platform, with security in mind.
                </p>
              </div>
              <div className="flex flex-col items-center text-center p-8 rounded-xl border bg-card shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out hover:border-primary/50 transform hover:-translate-y-2">
                <div className="p-4 rounded-full bg-primary/10 mb-6 shadow-md">
                  <Terminal className="h-12 w-12 text-primary" />
                </div>
                <h3 className="text-2xl font-semibold mb-3 text-foreground">AI-Powered Debugging</h3>
                <p className="text-sm text-muted-foreground">
                  Analyze deployment logs with AI to quickly identify and fix issues.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="flex flex-col gap-2 sm:flex-row py-8 w-full shrink-0 items-center px-4 md:px-6 border-t bg-secondary/50">
        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} David Cyril Tech 2024 - 2099. All rights reserved.</p>
        <nav className="sm:ml-auto flex gap-4 sm:gap-6">
           <Link href="/privacy" className="text-xs hover:underline underline-offset-4 text-muted-foreground hover:text-primary">
            Privacy Policy
          </Link>
          <Link href="/terms" className="text-xs hover:underline underline-offset-4 text-muted-foreground hover:text-primary">
            Terms of Service
          </Link>
        </nav>
      </footer>
    </div>
  );
}
