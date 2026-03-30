import { useTranslation } from "react-i18next";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/shared/ui/button";
import { Check, Globe } from "lucide-react";

const LANGUAGES = ["ru", "en", "uz"] as const;

export function LanguageSwitcher(): React.JSX.Element {
  const { i18n } = useTranslation();

  const currentLang = i18n.language;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-10 rounded-full border border-white/10 bg-white/10 px-4 text-sm text-white/90 backdrop-blur-md hover:bg-white/20"
        >
          <Globe className="mr-2 h-4 w-4 opacity-70" />
          {currentLang.toUpperCase()}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-32 rounded-xl border border-white/10 p-1 backdrop-blur-xl">
        {LANGUAGES.map((lang) => {
          const isActive = currentLang === lang;

          return (
            <DropdownMenuItem
              key={lang}
              onClick={() => void i18n.changeLanguage(lang)}
              className="flex cursor-pointer items-center justify-between rounded-lg px-3 py-2 text-sm text-white/90 focus:bg-white/10"
            >
              <span>{lang.toUpperCase()}</span>

              {isActive && <Check className="h-4 w-4 text-blue-400" />}
            </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
