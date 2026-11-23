import type Hls from "hls.js";
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
    let cancelled = false;

    const setup = async () => {
      if (cancelled || !videoRef.current) return;

      // HLS. The player library is large (about 600 KB), so it is fetched only when a stream is actually opened,
      // not with the dashboard that every visitor loads.
      if (url.endsWith(".m3u8")) {
        const { default: HlsLib } = await import("hls.js");
        if (cancelled || !videoRef.current) return;
        if (HlsLib.isSupported()) {
          hls = new HlsLib();

          hls.loadSource(url);
          hls.attachMedia(videoRef.current);

          hls.on(HlsLib.Events.ERROR, (_, data) => {
            if (!autoReconnect) return;

            if (data.fatal) {
              retryRef.current++;

              setTimeout(
                () => {
                  hls?.destroy();
                  void setup();
                },
                Math.min(3000 * retryRef.current, 10000),
              );
            }
          });
          return;
        }
      }

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
    };

    void setup();

    return () => {
      cancelled = true;
      hls?.destroy();
    };
  }, [url, autoReconnect]);

  return <video ref={videoRef} controls autoPlay muted playsInline className="h-full w-full rounded-xl object-cover" />;
}
