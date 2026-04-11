import { Settings, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import { ICON_SETTINGS, ICON_SMALL } from "@/constants";

export function HeaderControls({ language, lang, onToggleLanguage, settingsOpen, onSettingsChange }) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-1 z-50">
      <button
        data-testid="language-toggle-btn"
        onClick={onToggleLanguage}
        className="lang-toggle-btn"
        title={lang.switchLang}
      >
        <Globe size={ICON_SMALL} />
        <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase">
          {language === "ru" ? "RU" : "EN"}
        </span>
      </button>

      <Dialog open={settingsOpen} onOpenChange={onSettingsChange}>
        <DialogTrigger asChild>
          <button
            data-testid="settings-btn"
            className="text-[#00F0FF] hover:text-white transition-colors hover:rotate-90 duration-300 p-2"
          >
            <Settings size={ICON_SETTINGS} />
          </button>
        </DialogTrigger>
        <DialogContent className="bg-[#050505] border border-[#FF003C] text-white max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-['Orbitron'] text-[#FCEE0A] tracking-wider uppercase text-lg">
              {lang.systemConfig}
            </DialogTitle>
            <DialogDescription className="font-['JetBrains_Mono'] text-[#A0A0A0] text-xs">
              {lang.version}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="border border-[#333] p-4">
              <p className="font-['JetBrains_Mono'] text-xs text-[#00F0FF] mb-2">{lang.status}</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
                <span className="font-['JetBrains_Mono'] text-xs text-[#00FF41]">{lang.neuralLinkActive}</span>
              </div>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] mt-3">{lang.aiModel}</p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] mt-1">{lang.protocol}</p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] mt-1">{lang.languageLabel}</p>
            </div>
            <div className="border border-[#333] p-4">
              <p className="font-['JetBrains_Mono'] text-xs text-[#FF003C] mb-2">{lang.instructions}</p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] leading-relaxed">{lang.step1}</p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] leading-relaxed">{lang.step2}</p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] leading-relaxed">{lang.step3}</p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] leading-relaxed">{lang.step4}</p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
