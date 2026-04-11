import { RotateCcw, Share2, Loader2 } from "lucide-react";
import { ICON_SMALL } from "@/constants";

export function ResponseCard({ hint, sharing, onRetry, onShare }) {
  return (
    <div className="response-card" data-testid="response-container">
      <div className="response-header">
        <span className="font-['Orbitron'] text-xs text-[#FCEE0A] tracking-widest uppercase">
          // INTEL RECEIVED
        </span>
      </div>
      <p className="font-['JetBrains_Mono'] text-sm text-[#00F0FF] leading-relaxed whitespace-pre-wrap">
        {hint}
      </p>
      <div className="response-corner-tl" />
      <div className="response-corner-br" />

      <div className="flex gap-3 mt-4 flex-wrap">
        <button data-testid="try-again-btn" className="try-again-btn" onClick={onRetry}>
          <RotateCcw size={ICON_SMALL} />
          <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider">Re-analyze</span>
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
            {sharing ? "Generating..." : "Share Hint"}
          </span>
        </button>
      </div>
    </div>
  );
}
