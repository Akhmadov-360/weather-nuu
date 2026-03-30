import { useLatestWeatherQuery, useWeatherHistoryQuery } from "@/entities/weather/api/weather.queries";
import type { DashboardPageConfig } from "@/entities/weather/model/weather.types";
import { EmptyState } from "@/shared/ui/empty-state";
import { ErrorState } from "@/shared/ui/error-state";
import { motion, Variants } from "framer-motion";
import { useTranslation } from "react-i18next";

import { SensorCharts } from "@/widgets/sensor-charts/ui/SensorCharts";
import { TopBar } from "@/widgets/topbar/ui/TopBar";
import { WeatherSummary } from "@/widgets/weather-summary/ui/WeatherSummary";
import { SensorChartsSkeleton } from "./SensorChartsSkeletom";
import { TimeDisplay } from "./TimeDisplay";
import { WeatherSummarySkeleton } from "./WeatherSummarySkeleton";
import { LiveStreams } from "../../../components/LiveStreams";

type DashboardLayoutProps = {
  config: DashboardPageConfig;
};

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 18 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: [0.25, 0.1, 0.25, 1],
    },
  },
};

export function DashboardLayout({ config }: DashboardLayoutProps): React.JSX.Element {
  const latestQuery = useLatestWeatherQuery(config.key);
  const historyQuery = useWeatherHistoryQuery(config.key);
  const { t } = useTranslation();

  const isInitialLoading = latestQuery.isLoading || historyQuery.isLoading;
  const isError = latestQuery.isError || historyQuery.isError;

  const latest = latestQuery.data;
  const history = historyQuery.data;

  return (
    <main className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <BackgroundLayer />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-[1440px] flex-col px-4 py-4 sm:px-6 sm:py-6 lg:px-8">
        <TopBar titleKey={config.titleKey} switchPath={config.oppositePath} switchLabelKey={config.oppositeNavKey} />

        {isInitialLoading ? (
          <div className="mt-6 flex flex-1 flex-col gap-6">
            <section className="grid gap-6 xl:grid-cols-[minmax(260px,320px)_1fr] xl:items-start">
              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                className="rounded-3xl border border-white/10 bg-white/8 p-5 shadow-2xl backdrop-blur-xl"
              >
                <TimeDisplay isLoading />
              </motion.div>

              <motion.div variants={fadeUp} initial="hidden" animate="visible">
                <WeatherSummarySkeleton />
              </motion.div>
            </section>

            <motion.div variants={fadeUp} initial="hidden" animate="visible" className="flex-1">
              <SensorChartsSkeleton />
            </motion.div>
          </div>
        ) : isError ? (
          <div className="mt-6">
            <GlassPanel className="p-6">
              <ErrorState
                message={t("error_data")}
                onRetry={() => {
                  void latestQuery.refetch();
                  void historyQuery.refetch();
                }}
              />
            </GlassPanel>
          </div>
        ) : !latest || !history || history.length === 0 ? (
          <div className="mt-6">
            <GlassPanel className="p-6">
              <EmptyState title={t("empty_title")} description={t("empty_description")} />
            </GlassPanel>
          </div>
        ) : (
          <div className="mt-6 flex flex-1 flex-col gap-6">
            <section className="grid gap-6 xl:grid-cols-[minmax(260px,320px)_1fr] xl:items-start">
              <motion.div variants={fadeUp} initial="hidden" animate="visible">
                <GlassPanel className="p-5 sm:p-6">
                  <TimeDisplay />
                </GlassPanel>
              </motion.div>

              <motion.div
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                transition={{ delay: 0.05, duration: 0.45, ease: "easeOut" }}
              >
                <WeatherSummary latest={latest} />
              </motion.div>
            </section>

            <motion.section
              variants={fadeUp}
              initial="hidden"
              animate="visible"
              transition={{ delay: 0.1, duration: 0.45, ease: "easeOut" }}
              className="flex-1"
            >
              <SensorCharts history={history} />
            </motion.section>

            <LiveStreams />
          </div>
        )}
      </div>
    </main>
  );
}

function BackgroundLayer(): React.JSX.Element {
  return (
    <>
      <div
        className="absolute inset-0 bg-cover bg-center blur-[2px] scale-105"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1707336862166-1e483cfa5c92?q=80&w=1470&auto=format&fit=crop&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
        }}
      />

      <div className="absolute inset-0 bg-slate-950/50" />

      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(148,163,184,0.18),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_30%)]" />
    </>
  );
}

type GlassPanelProps = {
  children: React.ReactNode;
  className?: string;
};

function GlassPanel({ children, className = "" }: GlassPanelProps): React.JSX.Element {
  return (
    <div
      className={[
        "rounded-[28px] border border-white/10 bg-white/8 shadow-[0_10px_40px_rgba(15,23,42,0.35)] backdrop-blur-xl",
        className,
      ].join(" ")}
    >
      {children}
    </div>
  );
}
