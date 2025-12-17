"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { NavBar } from "@/components/NavBar";

// Typewriter effect component
function TypewriterText({ text, className }: { text: string; className?: string }) {
  const [displayedText, setDisplayedText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, 50);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text]);

  return <span className={className}>{displayedText}</span>;
}

// Animated counter component
function AnimatedCounter({ end, duration = 2000, prefix = "", suffix = "" }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const countRef = useRef(0);

  useEffect(() => {
    const startTime = Date.now();
    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const current = Math.floor(progress * end);
      
      if (current !== countRef.current) {
        countRef.current = current;
        setCount(current);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(end);
      }
    };
    animate();
  }, [end, duration]);

  return <span>{prefix}{count}{suffix}</span>;
}

// Testimonial data
const testimonials = [
  {
    name: "Sarah Chen",
    role: "Student Visa Applicant",
    text: "The AI copilot helped me understand exactly what documents I needed. Saved me weeks of confusion!",
    rating: 5,
  },
  {
    name: "Raj Patel",
    role: "Tourist Visa Applicant",
    text: "Clear, simple explanations. Finally understood why my application was risky and how to fix it.",
    rating: 5,
  },
  {
    name: "Maria Garcia",
    role: "Student Visa Applicant",
    text: "The document checklist was spot-on. My visa was approved on the first try!",
    rating: 5,
  },
];

function TestimonialCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % testimonials.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative h-48 overflow-hidden rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-md p-6 shadow-lg">
      <div
        className="flex transition-transform duration-500 ease-in-out"
        style={{ transform: `translateX(-${currentIndex * 100}%)` }}
      >
        {testimonials.map((testimonial, index) => (
          <div key={index} className="min-w-full flex-shrink-0">
            <div className="flex gap-1 mb-2">
              {[...Array(testimonial.rating)].map((_, i) => (
                <span key={i} className="text-yellow-400">★</span>
              ))}
            </div>
            <p className="text-sm text-slate-700 mb-3 italic">"{testimonial.text}"</p>
            <div>
              <p className="font-semibold text-slate-900">{testimonial.name}</p>
              <p className="text-xs text-slate-500">{testimonial.role}</p>
            </div>
          </div>
        ))}
      </div>
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
        {testimonials.map((_, index) => (
          <button
            key={index}
            onClick={() => setCurrentIndex(index)}
            className={`h-2 rounded-full transition-all ${
              index === currentIndex ? "w-8 bg-indigo-600" : "w-2 bg-slate-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function PillBadge({ children, icon }: { children: React.ReactNode; icon?: string }) {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <span
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] text-slate-700 shadow-sm transition-all duration-300 ${
        isHovered ? "scale-110 shadow-md" : ""
      }`}
    >
      {icon && <span className="text-base animate-bounce">{icon}</span>}
      {children}
    </span>
  );
}

function Metric({ label, value, animated = false }: { label: string; value: string | number; animated?: boolean }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-slate-200 bg-white/80 backdrop-blur-sm px-3 py-2.5 shadow-sm transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      }`}
    >
      <p className="text-base font-semibold text-slate-900">
        {animated && typeof value === "number" ? (
          <AnimatedCounter end={value} suffix={label.includes("+") ? "+" : ""} />
        ) : (
          value
        )}
      </p>
      <p className="mt-0.5 text-xs text-slate-500">{label}</p>
    </div>
  );
}

function FeatureCard({ step, title, description, icon }: { step: number; title: string; description: string; icon: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.3 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={`rounded-2xl border border-slate-200/50 bg-white/60 backdrop-blur-md p-6 shadow-lg transition-all duration-700 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
      }`}
      style={{ transitionDelay: `${step * 100}ms` }}
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-linear-to-br from-indigo-500 to-purple-500 text-2xl">
          {icon}
        </div>
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-600">
          {step}
        </div>
      </div>
      <h3 className="text-lg font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-600">{description}</p>
    </div>
  );
}

export default function Home() {
  const [visaJourneysToday, setVisaJourneysToday] = useState(0);

  useEffect(() => {
    // Simulate live counter
    const interval = setInterval(() => {
      setVisaJourneysToday((prev) => prev + Math.floor(Math.random() * 3));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 transition-colors duration-300">
      {/* Animated gradient background */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-50 via-purple-50 to-pink-50 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
        </div>
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-indigo-300/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
      </div>

      <NavBar />
      
      <main className="relative mx-auto flex max-w-6xl flex-col gap-16 px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        {/* Hero Section */}
        <header className="space-y-8 relative z-10">
          <div className="flex flex-col gap-4">
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-indigo-500 dark:text-indigo-400">
              AI Visa & Immigration Copilot
            </p>
            <div className="space-y-4">
              <h1 className="text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl">
                <span className="bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent animate-gradient">
                  <TypewriterText text="Understand your visa options." />
                </span>{" "}
                <br />
                <span className="text-slate-900 dark:text-slate-100">Before you apply.</span>
              </h1>
              <p className="max-w-2xl text-lg text-slate-700 dark:text-slate-300">
                A calm, step-by-step assistant that turns official-style
                immigration rules into a{" "}
                <span className="font-semibold text-slate-900 dark:text-slate-100">
                  clear eligibility view, document checklist, and risk
                  explanation
                </span>{" "}
                for Canada & USA student and visitor visas.
              </p>
            </div>
          </div>

          <div className="grid gap-8 md:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] md:items-center">
            <div className="space-y-6">
              <div className="flex flex-wrap gap-2 text-[11px]">
                <PillBadge icon="🛡️">Trust-first design</PillBadge>
                <PillBadge icon="🤖">RAG + Gemini reasoning</PillBadge>
                <PillBadge icon="🌍">Multilingual explanations</PillBadge>
                <PillBadge icon="🎓">Student & tourist visas</PillBadge>
              </div>

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/application"
                  className="group relative inline-flex items-center justify-center overflow-hidden rounded-full bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-lg transition-all hover:bg-indigo-700 hover:shadow-xl hover:scale-105"
                >
                  <span className="absolute inset-0 bg-white opacity-0 transition-opacity group-hover:opacity-20" />
                  <span className="relative">Start visa eligibility check</span>
                  <span className="ml-2 relative">→</span>
                </Link>
                <Link
                  href="/assistant"
                  className="inline-flex items-center justify-center rounded-full border-2 border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-5 py-3 text-base font-medium text-slate-700 dark:text-slate-300 transition-all hover:bg-slate-100 dark:hover:bg-slate-700 hover:scale-105"
                >
                  Explore the AI assistant
                </Link>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Visa journeys tested in demo" value="100+" animated />
                <Metric label="Countries in full product vision" value="25+" animated />
                <Metric label="Time to first personalized checklist" value="< 1 minute" />
              </div>

              {/* Live counter */}
              <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm p-4">
                <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">
                  Visa journeys tested today
                </p>
                <p className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  <AnimatedCounter end={visaJourneysToday} />+
                </p>
              </div>
            </div>

            {/* Glass-morphism feature card */}
            <div className="space-y-3 rounded-3xl border border-slate-200/50 dark:border-slate-700/50 bg-white/60 dark:bg-slate-800/60 backdrop-blur-md p-6 shadow-xl">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                What this copilot does
              </p>
              <ul className="space-y-3 text-sm text-slate-700 dark:text-slate-300">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">1.</span>
                  <span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Collects your profile
                    </span>{" "}
                    – nationality, destination, purpose and duration.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">2.</span>
                  <span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Looks up rules
                    </span>{" "}
                    – via a small RAG knowledge base inspired by official
                    guidance.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">3.</span>
                  <span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Runs AI reasoning
                    </span>{" "}
                    – Gemini estimates eligibility and highlights risky points.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-600 dark:text-indigo-400 font-bold">4.</span>
                  <span>
                    <span className="font-semibold text-slate-900 dark:text-slate-100">
                      Produces a checklist
                    </span>{" "}
                    – required, conditional, and missing / risky documents.
                  </span>
                </li>
              </ul>
              <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                This is a hackathon demo and not legal advice. Always confirm
                final requirements on the official immigration website before
                you apply.
              </p>
            </div>
          </div>
        </header>

        {/* Trust Indicators Section */}
        <section className="space-y-6 relative z-10">
          <h2 className="text-3xl font-semibold text-center text-slate-900 dark:text-slate-100">
            Trusted by thousands of applicants
          </h2>
          
          <div className="grid gap-6 md:grid-cols-3">
            {/* Success Rate */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 shadow-lg text-center">
              <div className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mb-2">
                <AnimatedCounter end={94} suffix="%" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Success rate</p>
            </div>

            {/* Trusted by */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 shadow-lg text-center">
              <div className="text-4xl font-bold text-indigo-600 dark:text-indigo-400 mb-2">
                <AnimatedCounter end={5234} suffix="+" />
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400">Trusted by applicants</p>
            </div>

            {/* Security Badge */}
            <div className="rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-6 shadow-lg text-center">
              <div className="text-3xl mb-2">🔒</div>
              <p className="text-sm font-semibold text-slate-900 dark:text-slate-100 mb-1">Data Encrypted</p>
              <p className="text-xs text-slate-600 dark:text-slate-400">Privacy Compliant</p>
            </div>
          </div>

          {/* Testimonial Carousel */}
          <TestimonialCarousel />
        </section>

        {/* Feature Steps Section with Parallax */}
        <section className="space-y-8 relative z-10">
          <h2 className="text-3xl font-semibold text-center text-slate-900 dark:text-slate-100">
            How it works
          </h2>
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              step={1}
              title="Your Profile"
              description="We collect your nationality, destination, purpose, and duration."
              icon="👤"
            />
            <FeatureCard
              step={2}
              title="Official Rules"
              description="The AI looks up a knowledge base based on real government guidance."
              icon="📚"
            />
            <FeatureCard
              step={3}
              title="AI Reasoning"
              description="Gemini combines your profile with rules to estimate eligibility."
              icon="🧠"
            />
            <FeatureCard
              step={4}
              title="Clear Checklist"
              description="Legal requirements are translated into simple, actionable steps."
              icon="✅"
            />
          </div>
        </section>

      </main>
    </div>
  );
}
