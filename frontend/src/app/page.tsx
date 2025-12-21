'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useScroll, useTransform, useInView } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/theme-toggle'
import { 
  Sparkles, 
  Briefcase, 
  Users, 
  FileCheck, 
  Zap, 
  Brain, 
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Bot,
  Shield,
  BarChart3,
  Mail,
  Github,
  Twitter,
  Linkedin,
  Rocket,
  Target,
  Layers,
  Play,
  Star,
  Quote,
  ArrowUpRight,
  Check,
  Cpu,
  FileText,
  MessageSquare,
  Search,
  Filter,
  Clock,
  Award,
  Globe,
  Lock,
  Workflow,
  ChevronRight
} from 'lucide-react'

export default function LandingPage() {
  const heroRef = useRef<HTMLDivElement>(null)
  const featuresRef = useRef<HTMLDivElement>(null)
  const workflowRef = useRef<HTMLDivElement>(null)
  const statsRef = useRef<HTMLDivElement>(null)
  const testimonialsRef = useRef<HTMLDivElement>(null)
  const bentoRef = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll()
  
  const heroY = useTransform(scrollYProgress, [0, 0.3], [0, -50])
  const heroScale = useTransform(scrollYProgress, [0, 0.3], [1, 0.95])
  
  const featuresInView = useInView(featuresRef, { once: true, margin: "-100px" })
  const workflowInView = useInView(workflowRef, { once: true, margin: "-100px" })
  const statsInView = useInView(statsRef, { once: true, margin: "-100px" })
  const testimonialsInView = useInView(testimonialsRef, { once: true, margin: "-100px" })
  const bentoInView = useInView(bentoRef, { once: true, margin: "-100px" })

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08 }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] as const }
    }
  }

  const testimonials = [
    {
      quote: "HR Copilot reduced our time-to-hire by 73%. The AI evaluations are incredibly accurate and saved us hundreds of hours.",
      author: "Sarah Chen",
      role: "VP of People",
      company: "TechFlow Inc.",
      avatar: "SC"
    },
    {
      quote: "The best hiring tool we've ever used. It's like having a senior recruiter working 24/7. Absolutely game-changing.",
      author: "Marcus Johnson",
      role: "Head of Talent",
      company: "ScaleUp Labs",
      avatar: "MJ"
    },
    {
      quote: "Finally, an AI tool that actually understands context. The candidate matching is phenomenal and our quality of hires improved dramatically.",
      author: "Emily Rodriguez",
      role: "HR Director",
      company: "Innovate Corp",
      avatar: "ER"
    }
  ]

  const stats = [
    { value: "10x", label: "Faster Screening", sublabel: "vs. manual review" },
    { value: "95%", label: "Match Accuracy", sublabel: "verified by clients" },
    { value: "500+", label: "Companies", sublabel: "trust HR Copilot" },
    { value: "1M+", label: "Candidates", sublabel: "evaluated monthly" }
  ]

  const capabilities = [
    {
      icon: Brain,
      title: "Intelligent Resume Parsing",
      description: "Extract skills, experience, and qualifications with 99.2% accuracy using advanced NLP models.",
      gradient: "from-violet-500 to-purple-600"
    },
    {
      icon: Target,
      title: "Precision Matching",
      description: "AI-powered scoring that understands context, not just keywords. Find the perfect fit every time.",
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      icon: Zap,
      title: "Instant Evaluations",
      description: "Get comprehensive candidate assessments in seconds. No more days of manual screening.",
      gradient: "from-amber-500 to-orange-500"
    },
    {
      icon: MessageSquare,
      title: "AI Chat Assistant",
      description: "Ask questions about any candidate. Get instant insights, comparisons, and recommendations.",
      gradient: "from-pink-500 to-rose-500"
    },
    {
      icon: Mail,
      title: "Smart Communication",
      description: "Generate personalized emails for invites, rejections, and follow-ups. Maintain candidate experience.",
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      icon: Shield,
      title: "Enterprise Security",
      description: "SOC 2 compliant, end-to-end encryption, GDPR ready. Your data is protected at every step.",
      gradient: "from-slate-500 to-zinc-600"
    }
  ]

  const workflowSteps = [
    {
      step: "01",
      title: "Create Your Job",
      description: "Paste any job description. Our AI instantly extracts requirements, skills, and creates a structured blueprint.",
      visual: "JD",
      color: "purple"
    },
    {
      step: "02", 
      title: "Upload Candidates",
      description: "Drag and drop resumes in any format. Bulk upload supported. AI processes each one in under 3 seconds.",
      visual: "CV",
      color: "blue"
    },
    {
      step: "03",
      title: "AI Evaluation",
      description: "Get detailed fit scores, skill matches, gap analysis, and hiring recommendations for each candidate.",
      visual: "AI",
      color: "pink"
    },
    {
      step: "04",
      title: "Make Decisions",
      description: "Review insights, chat with AI for deeper analysis, send automated emails, and hire with confidence.",
      visual: "✓",
      color: "green"
    }
  ]

  return (
    <div className="min-h-screen bg-background overflow-x-hidden">
      {/* Navigation */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/60 backdrop-blur-xl border-b border-white/10">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold tracking-tight">HR Copilot</span>
            </Link>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">How it Works</a>
              <a href="#testimonials" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Testimonials</a>
            </nav>
            <div className="flex items-center gap-3">
              <ThemeToggle />
              <Link href="/dashboard" className="hidden sm:block">
                <Button variant="ghost" size="sm">Sign In</Button>
              </Link>
              <Link href="/dashboard">
                <Button size="sm" className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-lg shadow-purple-500/25">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <motion.section
        ref={heroRef}
        style={{ y: heroY, scale: heroScale }}
        className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
      >
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-b from-purple-50/80 via-background to-background dark:from-purple-950/30 dark:via-background" />
        
        {/* Mesh Gradient */}
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-400/30 dark:bg-purple-600/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute top-1/4 right-1/4 w-[500px] h-[500px] bg-pink-400/20 dark:bg-pink-600/15 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-[400px] h-[400px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(120,119,198,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(120,119,198,0.03)_1px,transparent_1px)] bg-[size:60px_60px]" />

        <div className="relative z-10 container mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="max-w-6xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="text-center mb-16"
            >
              {/* Badge */}
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-pink-100 dark:from-purple-900/40 dark:to-pink-900/40 border border-purple-200/50 dark:border-purple-700/50 mb-8"
              >
                <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                <span className="text-sm font-medium bg-clip-text text-transparent bg-gradient-to-r from-purple-700 to-pink-700 dark:from-purple-300 dark:to-pink-300">
                  Now with GPT-4 Turbo Integration
                </span>
              </motion.div>

              {/* Headline */}
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.3 }}
                className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight mb-6"
              >
                <span className="block">Hire Smarter.</span>
                <span className="block bg-clip-text text-transparent bg-gradient-to-r from-purple-600 via-pink-600 to-purple-600 dark:from-purple-400 dark:via-pink-400 dark:to-purple-400">
                  Hire Faster.
                </span>
              </motion.h1>

              {/* Subheadline */}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.4 }}
                className="text-lg sm:text-xl md:text-2xl text-muted-foreground mb-10 max-w-3xl mx-auto leading-relaxed"
              >
                AI-powered candidate evaluation that understands context, not just keywords. 
                Transform weeks of screening into minutes.
              </motion.p>

              {/* CTAs */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.5 }}
                className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12"
              >
                <Link href="/dashboard">
                  <Button size="lg" className="group text-base px-8 py-6 h-auto bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 border-0 shadow-xl shadow-purple-500/30 transition-all hover:shadow-purple-500/40 hover:scale-105">
                    Start Free Trial
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="group text-base px-8 py-6 h-auto border-2 hover:bg-accent/50"
                >
                  <Play className="mr-2 w-4 h-4" />
                  Watch Demo
                  <span className="ml-2 text-xs text-muted-foreground">2 min</span>
                </Button>
              </motion.div>

              {/* Social Proof */}
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.8, delay: 0.6 }}
                className="flex flex-col items-center gap-4"
              >
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
                  ))}
                  <span className="ml-2 text-sm font-medium">4.9/5</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Trusted by <span className="font-semibold text-foreground">500+</span> companies worldwide
                </p>
              </motion.div>
            </motion.div>

            {/* Hero Visual - Product Mockup */}
            <motion.div
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.7, ease: [0.22, 1, 0.36, 1] }}
              className="relative"
            >
              {/* Glow Effect */}
              <div className="absolute -inset-4 bg-gradient-to-r from-purple-500/20 via-pink-500/20 to-purple-500/20 rounded-3xl blur-2xl" />
              
              {/* Main Card */}
              <div className="relative bg-card/80 backdrop-blur-xl border border-white/20 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden">
                {/* Window Controls */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-muted/30">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                  </div>
                  <div className="flex-1 flex justify-center">
                    <div className="px-4 py-1 rounded-md bg-muted/50 text-xs text-muted-foreground">
                      HR Copilot — Candidate Evaluation
                    </div>
                  </div>
                </div>

                {/* Content */}
                <div className="p-6 md:p-8">
                  <div className="grid md:grid-cols-3 gap-6">
                    {/* Candidate Profile */}
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white font-bold">
                          JD
                        </div>
                        <div>
                          <div className="font-semibold">John Doe</div>
                          <div className="text-xs text-muted-foreground">Senior Engineer</div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Experience</span>
                          <span className="font-medium">7 years</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Skills Match</span>
                          <span className="font-medium text-green-600 dark:text-green-400">92%</span>
                        </div>
                      </div>
                    </div>

                    {/* AI Score */}
                    <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-xl p-4 border border-purple-500/20">
                      <div className="text-sm text-muted-foreground mb-2">AI Fit Score</div>
                      <div className="text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600">
                        94
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">out of 100</div>
                      <div className="mt-4 flex gap-2">
                        <span className="px-2 py-1 rounded-full bg-green-500/10 text-green-600 dark:text-green-400 text-xs font-medium">
                          Strong Hire
                        </span>
                      </div>
                    </div>

                    {/* Key Insights */}
                    <div className="bg-muted/30 rounded-xl p-4 border border-border/50">
                      <div className="text-sm font-medium mb-3">Key Insights</div>
                      <div className="space-y-2">
                        {[
                          "React & TypeScript expert",
                          "Led teams of 5+ developers",
                          "Strong system design skills"
                        ].map((insight, i) => (
                          <div key={i} className="flex items-start gap-2 text-sm">
                            <CheckCircle2 className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                            <span className="text-muted-foreground">{insight}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Floating Elements */}
              <motion.div
                animate={{ y: [0, -10, 0] }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 bg-card border border-border/50 rounded-xl p-3 shadow-lg hidden md:block"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-green-500/10 flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  </div>
                  <div className="text-xs">
                    <div className="font-medium">+73%</div>
                    <div className="text-muted-foreground">Hiring Speed</div>
                  </div>
                </div>
              </motion.div>

              <motion.div
                animate={{ y: [0, 10, 0] }}
                transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-4 -left-4 bg-card border border-border/50 rounded-xl p-3 shadow-lg hidden md:block"
              >
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Bot className="w-4 h-4 text-purple-500" />
                  </div>
                  <div className="text-xs">
                    <div className="font-medium">AI Processing</div>
                    <div className="text-muted-foreground">&lt; 3 seconds</div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2"
        >
          <div className="flex flex-col items-center gap-2">
            <span className="text-xs text-muted-foreground">Scroll to explore</span>
            <div className="w-5 h-8 border-2 border-muted-foreground/30 rounded-full flex justify-center pt-1.5">
              <div className="w-1 h-2 bg-muted-foreground/50 rounded-full" />
            </div>
          </div>
        </motion.div>
      </motion.section>

      {/* Logos Section */}
      <section className="py-16 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-muted-foreground mb-8">
            Powering hiring for innovative teams at
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-60">
            {['TechFlow', 'ScaleUp', 'Innovate', 'NextGen', 'CloudFirst', 'DataDriven'].map((company) => (
              <div key={company} className="text-xl font-bold text-muted-foreground">
                {company}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <motion.section
        ref={statsRef}
        initial="hidden"
        animate={statsInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="py-24 relative overflow-hidden"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Numbers that speak for themselves
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join hundreds of companies transforming their hiring process
            </p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                variants={itemVariants}
                className="relative group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 rounded-2xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
                <div className="relative bg-card border border-border/50 rounded-2xl p-8 text-center hover:border-purple-500/30 transition-colors">
                  <div className="text-5xl md:text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-pink-600 mb-2">
                    {stat.value}
                  </div>
                  <div className="font-semibold mb-1">{stat.label}</div>
                  <div className="text-sm text-muted-foreground">{stat.sublabel}</div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Bento Grid Features */}
      <motion.section
        id="features"
        ref={bentoRef}
        initial="hidden"
        animate={bentoInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="py-24 relative bg-gradient-to-b from-background via-purple-50/30 to-background dark:via-purple-950/10"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm font-medium mb-4">
              Features
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Everything you need to hire better
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              A complete AI-powered hiring platform that handles the heavy lifting
            </p>
          </motion.div>

          {/* Bento Grid */}
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {/* Large Feature Card */}
            <motion.div
              variants={itemVariants}
              className="md:col-span-2 group"
            >
              <div className="h-full bg-gradient-to-br from-purple-600 to-pink-600 rounded-3xl p-8 md:p-10 text-white relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                  <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-xl flex items-center justify-center mb-6">
                    <Brain className="w-7 h-7" />
                  </div>
                  <h3 className="text-2xl md:text-3xl font-bold mb-3">AI-Powered Intelligence</h3>
                  <p className="text-white/80 text-lg mb-6 max-w-xl">
                    Our advanced AI understands nuance and context. It doesn't just match keywords—it comprehends skills, experience levels, and cultural fit.
                  </p>
                  <div className="flex flex-wrap gap-3">
                    {['GPT-4 Turbo', 'RAG Technology', 'Semantic Search'].map((tech) => (
                      <span key={tech} className="px-3 py-1.5 rounded-full bg-white/20 text-sm font-medium backdrop-blur-xl">
                        {tech}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Speed Card */}
            <motion.div variants={itemVariants} className="group">
              <div className="h-full bg-card border border-border/50 rounded-3xl p-6 md:p-8 hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center mb-5">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Lightning Fast</h3>
                <p className="text-muted-foreground mb-4">
                  Process and evaluate candidates in under 3 seconds. No more waiting days for screening.
                </p>
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600 dark:text-amber-400">
                  <Clock className="w-4 h-4" />
                  Average: 2.3 seconds
                </div>
              </div>
            </motion.div>

            {/* Security Card */}
            <motion.div variants={itemVariants} className="group">
              <div className="h-full bg-card border border-border/50 rounded-3xl p-6 md:p-8 hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center mb-5">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">Enterprise Secure</h3>
                <p className="text-muted-foreground mb-4">
                  SOC 2 Type II certified. GDPR & CCPA compliant. Your data is encrypted at rest and in transit.
                </p>
                <div className="flex items-center gap-3">
                  {[Lock, Globe, Award].map((Icon, i) => (
                    <div key={i} className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                      <Icon className="w-4 h-4 text-emerald-500" />
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>

            {/* Chat Card */}
            <motion.div variants={itemVariants} className="group">
              <div className="h-full bg-card border border-border/50 rounded-3xl p-6 md:p-8 hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/5">
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center mb-5">
                  <MessageSquare className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-xl font-bold mb-2">AI Chat Assistant</h3>
                <p className="text-muted-foreground mb-4">
                  Ask anything about candidates. Compare skills, get recommendations, and make informed decisions.
                </p>
                <div className="bg-muted/50 rounded-xl p-3 text-sm">
                  <span className="text-muted-foreground">"Compare top 3 candidates for React experience"</span>
                </div>
              </div>
            </motion.div>

            {/* Analytics Card - Wide */}
            <motion.div variants={itemVariants} className="md:col-span-2 group">
              <div className="h-full bg-card border border-border/50 rounded-3xl p-6 md:p-8 hover:border-purple-500/30 transition-all hover:shadow-xl hover:shadow-purple-500/5">
                <div className="flex flex-col md:flex-row md:items-center gap-6">
                  <div className="flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-purple-500 flex items-center justify-center mb-5">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold mb-2">Deep Analytics & Insights</h3>
                    <p className="text-muted-foreground">
                      Track hiring metrics, identify bottlenecks, and optimize your pipeline with data-driven insights.
                    </p>
                  </div>
                  <div className="flex-shrink-0 grid grid-cols-3 gap-3">
                    {[
                      { label: 'Time to Hire', value: '-45%' },
                      { label: 'Quality Score', value: '+38%' },
                      { label: 'Cost Savings', value: '60%' }
                    ].map((metric) => (
                      <div key={metric.label} className="text-center p-3 rounded-xl bg-muted/50">
                        <div className="text-lg font-bold text-purple-600 dark:text-purple-400">{metric.value}</div>
                        <div className="text-xs text-muted-foreground">{metric.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* How It Works */}
      <motion.section
        id="how-it-works"
        ref={workflowRef}
        initial="hidden"
        animate={workflowInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="py-24 relative"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-sm font-medium mb-4">
              How It Works
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Simple. Powerful. Effective.
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Get started in minutes, not days. Our intuitive workflow guides you through every step.
            </p>
          </motion.div>

          <div className="grid lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {workflowSteps.map((step, index) => (
              <motion.div
                key={step.step}
                variants={itemVariants}
                className="relative"
              >
                {/* Connector Line */}
                {index < workflowSteps.length - 1 && (
                  <div className="hidden lg:block absolute top-16 left-[60%] w-[80%] h-0.5 bg-gradient-to-r from-border to-transparent" />
                )}
                
                <div className="group">
                  <div className={`w-32 h-32 mx-auto mb-6 rounded-3xl bg-gradient-to-br ${
                    step.color === 'purple' ? 'from-purple-500 to-violet-600' :
                    step.color === 'blue' ? 'from-blue-500 to-cyan-500' :
                    step.color === 'pink' ? 'from-pink-500 to-rose-500' :
                    'from-green-500 to-emerald-500'
                  } flex items-center justify-center text-white text-4xl font-bold shadow-xl shadow-${step.color}-500/30 group-hover:scale-105 transition-transform`}>
                    {step.visual}
                  </div>
                  <div className="text-center">
                    <div className="text-sm font-mono text-muted-foreground mb-2">{step.step}</div>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">{step.description}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* Capabilities Grid */}
      <motion.section
        ref={featuresRef}
        initial="hidden"
        animate={featuresInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="py-24 bg-muted/30"
      >
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-pink-100 dark:bg-pink-900/30 text-pink-700 dark:text-pink-300 text-sm font-medium mb-4">
              Capabilities
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Built for modern hiring teams
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Every feature designed to save time and improve hiring outcomes
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {capabilities.map((cap, index) => {
              const Icon = cap.icon
              return (
                <motion.div
                  key={cap.title}
                  variants={itemVariants}
                  whileHover={{ y: -5 }}
                  className="group"
                >
                  <div className="h-full bg-card border border-border/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all hover:shadow-xl">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cap.gradient} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-lg font-bold mb-2">{cap.title}</h3>
                    <p className="text-muted-foreground text-sm leading-relaxed">{cap.description}</p>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </motion.section>

      {/* Testimonials */}
      <motion.section
        id="testimonials"
        ref={testimonialsRef}
        initial="hidden"
        animate={testimonialsInView ? "visible" : "hidden"}
        variants={containerVariants}
        className="py-24 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-b from-purple-50/50 via-background to-pink-50/50 dark:from-purple-950/20 dark:via-background dark:to-pink-950/20" />
        
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <motion.div variants={itemVariants} className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 text-sm font-medium mb-4">
              Testimonials
            </span>
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Loved by hiring teams
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              See what our customers have to say about their experience
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
            {testimonials.map((testimonial, index) => (
              <motion.div
                key={testimonial.author}
                variants={itemVariants}
                className="group"
              >
                <div className="h-full bg-card border border-border/50 rounded-2xl p-6 hover:border-purple-500/30 transition-all hover:shadow-xl relative">
                  <Quote className="absolute top-6 right-6 w-8 h-8 text-purple-200 dark:text-purple-800" />
                  <div className="flex items-center gap-1 mb-4">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    ))}
                  </div>
                  <p className="text-muted-foreground mb-6 leading-relaxed">
                    "{testimonial.quote}"
                  </p>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold text-sm">
                      {testimonial.avatar}
                    </div>
                    <div>
                      <div className="font-semibold text-sm">{testimonial.author}</div>
                      <div className="text-xs text-muted-foreground">{testimonial.role}, {testimonial.company}</div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-600 via-pink-600 to-purple-700" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(255,255,255,0.15),transparent_50%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_70%,rgba(255,255,255,0.1),transparent_50%)]" />
        
        {/* Floating shapes */}
        <div className="absolute top-10 left-10 w-32 h-32 border border-white/20 rounded-full" />
        <div className="absolute bottom-10 right-10 w-48 h-48 border border-white/10 rounded-full" />
        <div className="absolute top-1/2 left-1/4 w-4 h-4 bg-white/30 rounded-full" />
        <div className="absolute bottom-1/3 right-1/3 w-6 h-6 bg-white/20 rounded-full" />

        <div className="container mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8 }}
            >
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur-xl text-white text-sm font-medium mb-8">
                <Rocket className="w-4 h-4" />
                Start your free trial today
              </div>
              <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">
                Ready to transform<br />your hiring?
              </h2>
              <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
                Join 500+ companies already hiring smarter with HR Copilot. 
                No credit card required.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link href="/dashboard">
                  <Button 
                    size="lg" 
                    className="text-lg px-8 py-6 h-auto bg-white text-purple-600 hover:bg-white/90 border-0 shadow-2xl shadow-black/20 hover:scale-105 transition-all"
                  >
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </Button>
                </Link>
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg px-8 py-6 h-auto border-2 border-white/30 text-white hover:bg-white/10 bg-transparent"
                >
                  Talk to Sales
                </Button>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border bg-card py-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-5 gap-8 mb-12">
            {/* Brand */}
            <div className="lg:col-span-2">
              <Link href="/" className="flex items-center gap-2.5 mb-4">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-pink-600 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold">HR Copilot</span>
              </Link>
              <p className="text-muted-foreground mb-6 max-w-sm">
                AI-powered hiring platform that helps you find, evaluate, and hire the best candidates faster than ever.
              </p>
              <div className="flex gap-3">
                {[Twitter, Linkedin, Github].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-xl border border-border flex items-center justify-center hover:bg-accent hover:border-purple-500/30 transition-colors">
                    <Icon className="w-5 h-5" />
                  </a>
                ))}
              </div>
            </div>

            {/* Links */}
            {[
              {
                title: 'Product',
                links: ['Features', 'Pricing', 'Integrations', 'Changelog', 'API']
              },
              {
                title: 'Company',
                links: ['About', 'Blog', 'Careers', 'Press', 'Contact']
              },
              {
                title: 'Resources',
                links: ['Documentation', 'Help Center', 'Community', 'Templates', 'Webinars']
              }
            ].map((section) => (
              <div key={section.title}>
                <h4 className="font-semibold mb-4">{section.title}</h4>
                <ul className="space-y-3">
                  {section.links.map((link) => (
                    <li key={link}>
                      <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                        {link}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <div className="pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} HR Copilot. All rights reserved.
            </p>
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-foreground transition-colors">Security</a>
              <a href="#" className="hover:text-foreground transition-colors">Cookies</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
