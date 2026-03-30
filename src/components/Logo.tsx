import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import logo from "../shared/assets/logo_1725628085.png";
import { useTranslation } from "react-i18next";

export function Logo() {
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex cursor-pointer items-center gap-2 drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]">
          <img
            src={logo}
            alt="NUU Logo"
            className="h-7 sm:h-8 w-auto object-contain transition-transform duration-200 hover:scale-105"
          />
        </div>
      </TooltipTrigger>

      <TooltipContent>
        <p>{t("university")}</p>
      </TooltipContent>
    </Tooltip>
  );
}
