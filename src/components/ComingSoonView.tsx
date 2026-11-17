import { motion } from 'motion/react';
import { LayoutGrid } from 'lucide-react';

export function ComingSoonView() {
  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden bg-[#0B0F10] text-white">
      {/* Top-right radial teal glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-12 -right-12 h-72 w-72 rounded-full opacity-75 blur-2xl"
        style={{
          background:
            'radial-gradient(circle, rgba(24, 118, 128, 0.3) 0%, rgba(16, 72, 82, 0.12) 55%, rgba(11, 15, 16, 0) 75%)',
        }}
      />

      <header className="relative z-10 flex h-16 items-center justify-center px-6 pt-4">
        <h1 className="text-[17px] font-semibold tracking-tight text-white">MeTime</h1>
      </header>

      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-8 pb-24 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="flex w-full flex-col items-center rounded-[28px] border border-white/[0.06] bg-[#1A1D21]/85 px-6 py-10"
        >
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/[0.07] bg-[#1C2124] text-[#6EEFA2]">
            <LayoutGrid className="h-6 w-6" />
          </div>
          <h2 className="text-[20px] font-bold tracking-tight text-white">Coming soon</h2>
          <p className="mt-2 max-w-[230px] text-[13px] leading-relaxed text-[#8E959B]">
            Quick shortcuts, recurring bills, and smart budget widgets are on the way.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
