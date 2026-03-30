import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { StreamPlayer } from "./StreamPlayer";

type StreamModalProps = {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
};

export function StreamModal({ open, onClose, url, title }: StreamModalProps) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.96, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="relative w-full max-w-5xl px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={onClose}
              className="absolute right-6 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
              <StreamPlayer url={url} />
            </div>

            <div className="mt-3 text-sm text-white/80">{title}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
