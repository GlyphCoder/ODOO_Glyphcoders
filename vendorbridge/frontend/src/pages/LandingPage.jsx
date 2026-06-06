import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { ArrowRight, Boxes, LogIn, ShieldCheck } from 'lucide-react';

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260302_085640_276ea93b-d7da-4418-a09b-2aa5b490e838.mp4';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.16,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.75,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const trustedTeams = ['Procurement', 'Finance', 'Vendors', 'Approvals'];

export default function LandingPage() {
  return (
    <main className="relative min-h-screen w-full overflow-hidden bg-[#0e1311] text-white">
      <div className="absolute inset-0 z-0 overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="h-full w-full object-cover opacity-55 [filter:saturate(0.7)_brightness(0.55)_contrast(1.08)] [transform:scaleY(-1)]"
        >
          <source src={VIDEO_URL} type="video/mp4" />
        </video>
        <div className="landing-video-shade" />
        <div className="landing-dark-animation" />
      </div>

      <header className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-6">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-green-accent">
            <Boxes size={20} className="text-[#0e1311]" strokeWidth={2.5} />
          </span>
          <span className="font-schibsted text-xl font-semibold tracking-tight">VendorBridge</span>
        </Link>

        <Link
          to="/login"
          className="inline-flex h-10 items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 font-inter text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/15"
        >
          <LogIn size={16} />
          Log In
        </Link>
      </header>

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-88px)] w-full max-w-6xl flex-col items-center px-6 pb-14 pt-[18vh] text-center sm:pt-[20vh]">
        <motion.div
          className="flex w-full flex-col items-center gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <motion.div
            variants={itemVariants}
            className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 font-schibsted text-xs font-semibold uppercase text-white/75 backdrop-blur-md"
          >
            <ShieldCheck size={14} className="text-green-accent" />
            Procurement management workspace
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="max-w-5xl font-fustat text-[clamp(3rem,8vw,6rem)] font-extrabold leading-[0.98] tracking-tight text-white"
          >
            Simple <span className="text-green-accent">vendor management</span> for modern teams
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="max-w-2xl font-inter text-base leading-7 text-white/72 sm:text-lg"
          >
            Bring vendors, RFQs, quotations, approvals, purchase orders, and invoices into one focused procurement flow.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="flex w-full max-w-[500px] flex-col items-center justify-center gap-4 sm:flex-row"
          >
            <Link
              to="/signup"
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full bg-green-accent px-8 font-schibsted text-sm font-bold text-[#0e1311] shadow-[inset_-4px_-6px_25px_0_rgba(14,19,17,0.14),inset_4px_4px_10px_0_rgba(255,255,255,0.18)] transition-transform duration-300 hover:scale-[0.98] sm:w-auto"
            >
              Sign Up
              <ArrowRight size={17} />
            </Link>
            <Link
              to="/login"
              className="inline-flex h-14 w-full items-center justify-center gap-2 rounded-full border border-green-accent/70 bg-[#0e1311]/70 px-8 font-schibsted text-sm font-bold text-green-accent shadow-[inset_-4px_-6px_25px_0_rgba(255,255,255,0.06),inset_4px_4px_10px_0_rgba(0,0,0,0.28)] backdrop-blur-md transition-transform duration-300 hover:scale-[0.98] sm:w-auto"
            >
              Log In
            </Link>
          </motion.div>

          <motion.div variants={itemVariants} className="mt-5 flex flex-col items-center gap-4 sm:flex-row">
            <div className="flex -space-x-2">
              {[12, 23, 32, 47].map((id) => (
                <img
                  key={id}
                  src={`https://i.pravatar.cc/100?img=${id}`}
                  alt=""
                  className="h-9 w-9 rounded-full border-2 border-[#0e1311] object-cover"
                />
              ))}
            </div>
            <div className="text-center sm:text-left">
              <div className="text-sm leading-none text-green-accent">★★★★★</div>
              <p className="mt-1 font-inter text-sm font-medium text-white/65">1,020+ procurement reviews</p>
            </div>
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="mt-10 flex w-full max-w-3xl flex-wrap items-center justify-center gap-3 text-xs font-semibold uppercase text-white/45"
          >
            {trustedTeams.map((team) => (
              <span key={team} className="rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 backdrop-blur-md">
                {team}
              </span>
            ))}
          </motion.div>
        </motion.div>
      </section>
    </main>
  );
}
