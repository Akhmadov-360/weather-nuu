import { motion } from "framer-motion";

export function PageLoader(): React.JSX.Element {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-4">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-blue-400" />

        <div className="text-xs uppercase tracking-[0.25em] text-slate-300/60">Loading data...</div>
      </motion.div>
    </div>
  );
}
