import Hls from "hls.js";
import { useEffect, useRef } from "react";

type StreamPlayerProps = {
  url: string;
  autoReconnect?: boolean;
};

export function StreamPlayer({ url, autoReconnect = true }: StreamPlayerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const retryRef = useRef(0);

  useEffect(() => {
    if (!url || !videoRef.current) return;

    let hls: Hls | null = null;

    const setup = () => {
      if (!videoRef.current) return;

      // HLS
      if (url.endsWith(".m3u8") && Hls.isSupported()) {
        hls = new Hls();

        hls.loadSource(url);
        hls.attachMedia(videoRef.current);

        hls.on(Hls.Events.ERROR, (_, data) => {
          if (!autoReconnect) return;

          if (data.fatal) {
            retryRef.current++;

            setTimeout(
              () => {
                hls?.destroy();
                setup();
              },
              Math.min(3000 * retryRef.current, 10000),
            );
          }
        });
      } else {
        videoRef.current.src = url;

        videoRef.current.onerror = () => {
          if (!autoReconnect) return;

          retryRef.current++;

          setTimeout(
            () => {
              if (!videoRef.current) return;
              videoRef.current.load();
            },
            Math.min(3000 * retryRef.current, 10000),
          );
        };
      }
    };

    setup();

    return () => {
      hls?.destroy();
    };
  }, [url, autoReconnect]);

  return <video ref={videoRef} controls autoPlay muted playsInline className="h-full w-full rounded-xl object-cover" />;
}
