import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { LanguageSwitcher } from "@/widgets/language-switcher/ui/LanguageSwitcher";
import { Logo } from "../../../components/Logo";
import { useScrolledPast } from "../../../shared/hooks/useScrolledPasr";

type TopBarProps = {
  titleKey: string;
  switchPath: string;
  switchLabelKey: string;
};

export function TopBar({ titleKey, switchPath, switchLabelKey }: TopBarProps): React.JSX.Element {
  const { t } = useTranslation();
  const isStickyVisible = useScrolledPast(110);

  return (
    <>
      <motion.header
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.25, 0.1, 0.25, 1] }}
        className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"
      >
        <div className="flex items-center gap-3">
          <Logo />
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-white/90 sm:text-2xl">{t(titleKey)}</h1>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button
            asChild
            variant="ghost"
            className="h-10 rounded-full border border-white/10 bg-white/10 px-4 text-sm text-white/90 backdrop-blur-md transition-all hover:bg-white/20"
          >
            <Link to={switchPath}>{t(switchLabelKey)}</Link>
          </Button>

          <LanguageSwitcher />
        </div>
      </motion.header>

      <AnimatePresence>
        {isStickyVisible ? (
          <motion.div
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6"
          >
            <div className="mx-auto max-w-[1440px] rounded-2xl border border-white/10  px-4 py-3 shadow-[0_10px_30px_rgba(0,0,0,0.25)] backdrop-blur-xl">
              <div className="flex items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Logo />
                  <h2 className="truncate text-sm font-medium text-white/90 sm:text-base">{t(titleKey)}</h2>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    asChild
                    variant="ghost"
                    className="h-9 rounded-full border border-white/10 bg-white/10 px-3 text-xs text-white/90 backdrop-blur-md transition-all hover:bg-white/20 sm:px-4 sm:text-sm"
                  >
                    <Link to={switchPath}>{t(switchLabelKey)}</Link>
                  </Button>

                  <LanguageSwitcher />
                </div>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
}
