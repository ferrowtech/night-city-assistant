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

export function HeaderControls({ language, onToggleLanguage, settingsOpen, onSettingsChange }) {
  return (
    <div className="absolute top-4 right-4 flex items-center gap-1 z-50">
      <button
        data-testid="language-toggle-btn"
        onClick={onToggleLanguage}
        className="lang-toggle-btn"
        title={language === "ru" ? "Switch to English" : "Switch to Russian"}
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
              SYSTEM CONFIG
            </DialogTitle>
            <DialogDescription className="font-['JetBrains_Mono'] text-[#A0A0A0] text-xs">
              // Night City Assistant v2.1.77
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            <div className="border border-[#333] p-4">
              <p className="font-['JetBrains_Mono'] text-xs text-[#00F0FF] mb-2">STATUS:</p>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
                <span className="font-['JetBrains_Mono'] text-xs text-[#00FF41]">NEURAL LINK ACTIVE</span>
              </div>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] mt-3">AI Model: Claude Sonnet 4</p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] mt-1">Protocol: Emergent Universal Key</p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] mt-1">
                Language: {language === "ru" ? "Russian" : "English"}
              </p>
            </div>
            <div className="border border-[#333] p-4">
              <p className="font-['JetBrains_Mono'] text-xs text-[#FF003C] mb-2">INSTRUCTIONS:</p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] leading-relaxed">
                1. Take a photo or upload a screenshot from Cyberpunk 2077
              </p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] leading-relaxed">
                2. Hit GET HINT for AI-powered gameplay tips
              </p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] leading-relaxed">
                3. Use the share button to export your hint as a styled image
              </p>
              <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] leading-relaxed">
                4. Toggle RU/EN for language preference
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
