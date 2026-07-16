import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { ImageIcon, VideoIcon, MicIcon, Sparkles, ArrowRight, Zap, Globe, Shield, Star } from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-gray-200 bg-white/80 backdrop-blur-xl">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ED2024] via-[#FDB913] to-[#009A44]">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">AI Studio</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-gray-600 hover:text-gray-900 hover:bg-gray-100">
                Login
              </Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="bg-gradient-to-r from-[#ED2024] to-[#009A44] text-white hover:opacity-90 rounded-full px-6">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="relative pt-32 pb-20 md:pt-40 md:pb-32 overflow-hidden">
          {/* Background Effects */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-[#ED2024]/10 via-transparent to-transparent" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#FDB913]/10 rounded-full blur-3xl" />
          
          <div className="container mx-auto px-4 relative z-10">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              {/* Kurdish Flag */}
              <div className="mb-10 group">
                <div className="relative">
                  <div className="absolute -inset-4 rounded-2xl bg-gradient-to-r from-[#ED2024]/20 via-[#FDB913]/20 to-[#009A44]/20 blur-xl opacity-70 group-hover:opacity-100 transition-opacity" />
                  <div className="relative rounded-xl overflow-hidden shadow-2xl border-2 border-white/50 group-hover:scale-105 transition-transform duration-300">
                    <Image 
                      src="/images/flag-of-kurdistan.webp"
                      alt="Kurdistan Flag"
                      width={120}
                      height={75}
                      className="object-cover"
                    />
                  </div>
                </div>
              </div>

              <h1 className="text-balance text-5xl font-bold tracking-tight md:text-7xl lg:text-8xl text-gray-900">
                Create Amazing
                <br />
                <span className="bg-gradient-to-r from-[#ED2024] via-[#FDB913] to-[#009A44] bg-clip-text text-transparent">
                  Content with AI
                </span>
              </h1>
              
              <p className="mx-auto mt-8 max-w-2xl text-pretty text-lg md:text-xl text-gray-600">
                Generate stunning images, videos, and voice content using the most advanced AI models. 
                Powered by Flux, Pollinations, ElevenLabs, and more.
              </p>

              <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/auth/sign-up">
                  <Button size="lg" className="bg-gradient-to-r from-[#ED2024] to-[#009A44] text-white hover:opacity-90 rounded-full px-8 h-14 text-lg font-semibold gap-2 group">
                    Start Creating Free
                    <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button size="lg" variant="outline" className="border-gray-300 bg-white hover:bg-gray-50 rounded-full px-8 h-14 text-lg text-gray-700">
                    Sign In
                  </Button>
                </Link>
              </div>

              {/* Stats */}
              <div className="mt-16 grid grid-cols-3 gap-8 md:gap-16">
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900">10K+</div>
                  <div className="text-sm text-gray-500 mt-1">Images Created</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900">500+</div>
                  <div className="text-sm text-gray-500 mt-1">Active Users</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-gray-900">6+</div>
                  <div className="text-sm text-gray-500 mt-1">AI Models</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-32 border-t border-gray-100">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900">AI-Powered Creative Tools</h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Everything you need to create professional content with artificial intelligence
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              {/* Image Studio */}
              <div className="group relative rounded-3xl border border-gray-200 bg-white p-8 hover:border-[#ED2024]/50 hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#ED2024]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ED2024]/10">
                    <ImageIcon className="h-7 w-7 text-[#ED2024]" />
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold text-gray-900">Image Studio</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Generate photorealistic images, artwork, and designs using Flux, Pollinations, Freepik, and your own VPS servers.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Flux</span>
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Pollinations</span>
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">VPS</span>
                  </div>
                </div>
              </div>

              {/* Video Studio */}
              <div className="group relative rounded-3xl border border-gray-200 bg-white p-8 hover:border-[#FDB913]/50 hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#FDB913]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#FDB913]/10">
                    <VideoIcon className="h-7 w-7 text-[#FDB913]" />
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold text-gray-900">Video Studio</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Transform text prompts into stunning videos with AI-powered video generation technology.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Text to Video</span>
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">AI Generation</span>
                  </div>
                </div>
              </div>

              {/* Voice Studio */}
              <div className="group relative rounded-3xl border border-gray-200 bg-white p-8 hover:border-[#009A44]/50 hover:shadow-xl transition-all duration-300">
                <div className="absolute inset-0 rounded-3xl bg-gradient-to-b from-[#009A44]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative z-10">
                  <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#009A44]/10">
                    <MicIcon className="h-7 w-7 text-[#009A44]" />
                  </div>
                  <h3 className="mb-3 text-2xl font-semibold text-gray-900">Voice Studio</h3>
                  <p className="text-gray-600 leading-relaxed">
                    Create natural-sounding speech with ElevenLabs, Groq TTS, and Kurdish TTS in multiple languages.
                  </p>
                  <div className="mt-6 flex flex-wrap gap-2">
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">ElevenLabs</span>
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Kurdish</span>
                    <span className="px-3 py-1 rounded-full bg-gray-100 text-xs text-gray-600">Groq</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Why Choose Us */}
        <section className="py-20 md:py-32 border-t border-gray-100 bg-gray-50">
          <div className="container mx-auto px-4">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-5xl font-bold mb-4 text-gray-900">Why Choose AI Studio?</h2>
              <p className="text-gray-600 text-lg max-w-2xl mx-auto">
                Built with the latest AI technology for the best creative experience
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <Zap className="h-8 w-8 text-[#FDB913]" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Lightning Fast</h3>
                <p className="text-gray-500 text-sm">Generate content in seconds with optimized AI models</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <Globe className="h-8 w-8 text-[#009A44]" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Multi-Language</h3>
                <p className="text-gray-500 text-sm">Support for Kurdish, Arabic, English and more languages</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <Shield className="h-8 w-8 text-[#ED2024]" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Your Own VPS</h3>
                <p className="text-gray-500 text-sm">Use your own servers for unlimited generation</p>
              </div>
              <div className="text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white border border-gray-200 shadow-sm">
                  <Star className="h-8 w-8 text-[#FDB913]" />
                </div>
                <h3 className="text-lg font-semibold mb-2 text-gray-900">Free Credits</h3>
                <p className="text-gray-500 text-sm">Start with free credits and upgrade when needed</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 border-t border-gray-100">
          <div className="container mx-auto px-4">
            <div className="relative rounded-3xl bg-gradient-to-br from-[#ED2024] via-[#FDB913] to-[#009A44] p-12 md:p-20 text-center overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-white/20 to-transparent" />
              <div className="relative z-10">
                <h2 className="text-3xl md:text-5xl font-bold mb-6 text-white">Ready to Create?</h2>
                <p className="text-white/80 text-lg max-w-xl mx-auto mb-10">
                  Join thousands of creators using AI Studio to bring their ideas to life
                </p>
                <Link href="/auth/sign-up">
                  <Button size="lg" className="bg-white text-gray-900 hover:bg-gray-100 rounded-full px-10 h-14 text-lg font-semibold">
                    Get Started for Free
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12 bg-white">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#ED2024] via-[#FDB913] to-[#009A44]">
                <Sparkles className="h-5 w-5 text-white" />
              </div>
              <span className="text-lg font-bold text-gray-900">AI Studio</span>
            </div>
            <div className="flex items-center gap-3 rounded-full bg-gradient-to-r from-[#ED2024]/5 via-[#FDB913]/5 to-[#009A44]/5 border border-[#FDB913]/20 px-4 py-2">
              <div className="relative">
                <div className="absolute inset-0 rounded bg-gradient-to-r from-[#ED2024] via-[#FDB913] to-[#009A44] blur-[2px] opacity-40" />
                <Image 
                  src="/images/flag-of-kurdistan.webp"
                  alt="Kurdistan Flag"
                  width={26}
                  height={17}
                  className="relative rounded shadow-sm"
                />
              </div>
              <span className="text-sm font-medium bg-gradient-to-r from-[#ED2024] via-[#FDB913] to-[#009A44] bg-clip-text text-transparent">Made with love in Kurdistan</span>
            </div>
            <p className="text-sm text-gray-400">
              Powered by cutting-edge AI technology
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}
