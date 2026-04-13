import { useState } from "react";
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

const promoInputStyle = {
  flex: 1,
  padding: "0.5rem 0.6rem",
  background: "#0a0a0a",
  border: "1px solid rgba(252, 238, 10, 0.4)",
  color: "#FCEE0A",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.75rem",
  outline: "none",
  borderRadius: "0",
};

const promoBtnStyle = {
  padding: "0.5rem 0.75rem",
  background: "transparent",
  border: "1px solid rgba(252, 238, 10, 0.4)",
  color: "#FCEE0A",
  fontFamily: "'Orbitron', sans-serif",
  fontSize: "0.65rem",
  letterSpacing: "0.05em",
  cursor: "pointer",
};

export function HeaderControls({ language, lang, onToggleLanguage, settingsOpen, onSettingsChange, isPremium, onPromoActivate }) {
  const [promoInput, setPromoInput] = useState("");
  const [promoStatus, setPromoStatus] = useState(null); // null | 'success' | 'error'

  const handleApply = () => {
    const code = promoInput.trim();
    if (code.length > 0) {
      onPromoActivate(code);
      setPromoStatus("success");
      setPromoInput("");
    } else {
      setPromoStatus("error");
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleApply();
  };

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

            {/* Promo code section */}
            <div className="border border-[#333] p-4">
              <p className="font-['JetBrains_Mono'] text-xs text-[#FCEE0A] mb-2">{lang.promoLabel}</p>
              {isPremium ? (
                <div className="flex items-center gap-2" data-testid="promo-success">
                  <div className="w-2 h-2 rounded-full bg-[#00FF41]" />
                  <span className="font-['JetBrains_Mono'] text-xs text-[#00FF41] font-bold">
                    {lang.promoActivated}
                  </span>
                </div>
              ) : (
                <>
                  <div className="flex gap-2">
                    <input
                      data-testid="promo-input"
                      type="text"
                      style={promoInputStyle}
                      value={promoInput}
                      onChange={(e) => { setPromoInput(e.target.value); setPromoStatus(null); }}
                      onKeyDown={handleKeyDown}
                      placeholder={lang.promoPlaceholder}
                    />
                    <button
                      data-testid="promo-apply-btn"
                      style={promoBtnStyle}
                      onClick={handleApply}
                    >
                      {lang.promoApply}
                    </button>
                  </div>
                  {promoStatus === "success" && (
                    <p className="font-['JetBrains_Mono'] text-xs text-[#00FF41] mt-2 font-bold" data-testid="promo-activated-msg">
                      {lang.promoActivated}
                    </p>
                  )}
                  {promoStatus === "error" && (
                    <p className="font-['JetBrains_Mono'] text-xs text-[#FF003C] mt-2" data-testid="promo-error-msg">
                      {lang.promoInvalid}
                    </p>
                  )}
                </>
              )}
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
