import { Dialog as DialogPrimitive } from "@animate-ui/react/primitives/radix-ui";
import { AnimateIcon } from "@animate-ui/react/icons";
import { Button } from "@animate-ui/react/primitives/buttons/button";

import { X } from "@/components/animate-ui/icons/x";
import { StreamPlayer } from "./StreamPlayer";

type StreamModalProps = {
  open: boolean;
  onClose: () => void;
  url: string;
  title: string;
};

/** The live stream in a dialog: Esc, focus trap and the backdrop click come from Radix; the motion from Animate UI. */
export function StreamModal({ open, onClose, url, title }: StreamModalProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-1/2 left-1/2 z-50 w-full max-w-5xl -translate-x-1/2 -translate-y-1/2 px-4 outline-none"
        >
          <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>

          <AnimateIcon animateOnHover asChild>
            <DialogPrimitive.Close asChild>
              <Button
                type="button"
                hoverScale={1.06}
                tapScale={0.94}
                aria-label="Close"
                className="absolute right-6 top-4 z-10 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
              >
                <X className="h-5 w-5" aria-hidden />
              </Button>
            </DialogPrimitive.Close>
          </AnimateIcon>

          <div className="aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
            <StreamPlayer url={url} />
          </div>

          <div className="mt-3 text-sm text-white/80">{title}</div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
