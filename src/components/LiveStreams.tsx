import { useTranslation } from "react-i18next";
import { StreamCard } from "./StreamCard";

type Stream = {
  id: number;
  title: string;
  url: string;
};

const streams: Stream[] = [
  //   {
  //     id: 1,
  //     title: "Camera 1",
  //     url: "http://example.com/stream.m3u8",
  //   },
];

export function LiveStreams(): React.JSX.Element | null {
  const { t } = useTranslation();

  if (!streams.length) return null;

  return (
    <section className="rounded-[28px] border border-white/10 bg-white/5 p-4 backdrop-blur-xl">
      <h3 className="mb-4 text-sm text-white/80">{t("live_streams")}</h3>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {streams.map((stream) => (
          <StreamCard key={stream.id} {...stream} />
        ))}
      </div>
    </section>
  );
}
