import { useState } from "react";
import { RotateCcw, Share2, Loader2, Send } from "lucide-react";
import { ICON_SMALL } from "@/constants";

const inputStyle = {
  flex: 1,
  padding: "0.6rem 0.75rem",
  background: "#0a0a0a",
  border: "1px solid rgba(0, 255, 65, 0.4)",
  color: "#00FF41",
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: "0.8rem",
  outline: "none",
  boxSizing: "border-box",
  borderRadius: "0",
  WebkitAppearance: "none",
  MozAppearance: "none",
  appearance: "none",
};

const sendBtnStyle = {
  padding: "0.6rem 0.75rem",
  background: "transparent",
  border: "1px solid rgba(0, 255, 65, 0.4)",
  color: "#00FF41",
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
};

export function ResponseCard({ hint, sharing, loading, onRetry, onShare, onFollowUp, lang }) {
  const [question, setQuestion] = useState("");

  const handleSend = () => {
    if (!question.trim() || loading) return;
    onFollowUp(question);
    setQuestion("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="response-card" data-testid="response-container">
      <div className="response-header">
        <span
          className="font-['Orbitron'] text-base sm:text-lg font-bold text-[#FCEE0A] tracking-widest uppercase"
          style={{ fontWeight: 900 }}
        >
          {lang.intelReceived}
        </span>
      </div>
      <p className="font-['JetBrains_Mono'] text-sm text-[#00F0FF] leading-relaxed whitespace-pre-wrap">
        {hint === "__RATE_LIMITED__" ? (
          <a
            href="https://buy.stripe.com/fZudR9fur29n1oL7cZao802"
            target="_blank"
            rel="noopener noreferrer"
            data-testid="upgrade-link"
            className="text-[#FCEE0A] underline hover:text-white transition-colors"
          >
            {lang.rateLimitError}
          </a>
        ) : hint}
      </p>
      <div className="response-corner-tl" />
      <div className="response-corner-br" />

      {/* Follow-up input */}
      <div className="flex gap-2 mt-4 w-full" data-testid="followup-section">
        <input
          data-testid="followup-input"
          type="text"
          style={inputStyle}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={lang.questionPlaceholder}
          disabled={loading}
        />
        <button
          data-testid="followup-send-btn"
          style={sendBtnStyle}
          onClick={handleSend}
          disabled={!question.trim() || loading}
        >
          {loading
            ? <Loader2 size={ICON_SMALL} className="animate-spin" style={{ color: "#00FF41" }} />
            : <Send size={ICON_SMALL} />
          }
        </button>
      </div>

      <div className="flex gap-3 mt-3 flex-wrap">
        <button data-testid="try-again-btn" className="try-again-btn" onClick={onRetry}>
          <RotateCcw size={ICON_SMALL} />
          <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider">{lang.reAnalyze}</span>
        </button>
        <button
          data-testid="share-hint-btn"
          className="share-hint-btn"
          onClick={onShare}
          disabled={sharing}
        >
          {sharing
            ? <Loader2 size={ICON_SMALL} className="animate-spin" />
            : <Share2 size={ICON_SMALL} />
          }
          <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider">
            {sharing ? lang.generating : lang.shareHint}
          </span>
        </button>
      </div>
    </div>
  );
}
