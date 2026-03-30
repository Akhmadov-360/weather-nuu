import { useState } from "react";
import { motion } from "framer-motion";
import { StreamPlayer } from "./StreamPlayer";
import { StreamModal } from "./StreamModal";

type StreamCardProps = {
  title: string;
  url: string;
};

export function StreamCard({ title, url }: StreamCardProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <motion.div
        whileHover={{ scale: 1.02 }}
        className="relative cursor-pointer overflow-hidden rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl"
        onClick={() => setOpen(true)}
      >
        <div className="relative h-[200px] w-full sm:h-[240px]">
          <StreamPlayer url={url} />

          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-red-500/90 px-2 py-1 text-xs text-white">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            LIVE
          </div>
        </div>

        <div className="p-3 text-sm text-white/80">{title}</div>
      </motion.div>

      <StreamModal open={open} onClose={() => setOpen(false)} url={url} title={title} />
    </>
  );
}
