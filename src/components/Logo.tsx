import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
// The source is 1628 px wide but shown about 30 px high: ship small variants for 1x/2x/3x screens.
import logoSrcSet from "../shared/assets/logo_1725628085.png?w=32;64;96&format=webp&as=srcset";
import logoFallback from "../shared/assets/logo_1725628085.png?w=64&format=png";
import { useTranslation } from "react-i18next";

export function Logo() {
  const { t } = useTranslation();
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div className="flex cursor-pointer items-center gap-2 drop-shadow-[0_0_6px_rgba(255,255,255,0.15)]">
          <picture>
            <source type="image/webp" srcSet={logoSrcSet} sizes="(min-width: 640px) 32px, 28px" />
            <img
              src={logoFallback}
              alt="NUU Logo"
              width={32}
              height={32}
              className="h-7 sm:h-8 w-auto object-contain transition-transform duration-200 hover:scale-105"
            />
          </picture>
        </div>
      </TooltipTrigger>

      <TooltipContent>
        <p>{t("university")}</p>
      </TooltipContent>
    </Tooltip>
  );
}
