import { Loader2, Trash2 } from "lucide-react";
import { ICON_LOADING, ICON_ACTION } from "@/constants";

export function PreviewSection({ imagePreview, userQuestion, onQuestionChange, loading, lang, onGetHint, onClear }) {
  return (
    <div className="preview-section" data-testid="preview-section">
      <div className="image-preview-wrapper">
        <img src={imagePreview} alt="Screenshot" className="image-preview" data-testid="image-preview" />
        <div className="corner-tl" />
        <div className="corner-tr" />
        <div className="corner-bl" />
        <div className="corner-br" />
      </div>
      <textarea
        data-testid="user-question-input"
        className="user-question-input"
        value={userQuestion}
        onChange={(e) => onQuestionChange(e.target.value)}
        placeholder={lang.questionPlaceholder}
        rows={2}
        disabled={loading}
      />
      <div className="flex gap-3 w-full">
        <button
          data-testid="get-hint-btn"
          className="get-hint-btn flex-1"
          onClick={onGetHint}
          disabled={loading}
        >
          {loading ? <Loader2 size={ICON_LOADING} className="animate-spin" /> : lang.getHint}
        </button>
        <button
          data-testid="clear-image-btn"
          className="clear-btn"
          onClick={onClear}
          disabled={loading}
        >
          <Trash2 size={ICON_ACTION} />
        </button>
      </div>
    </div>
  );
}
