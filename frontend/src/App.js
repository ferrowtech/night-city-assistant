import { useState, useRef, useCallback, useMemo } from "react";
import "@/App.css";
import axios from "axios";
import { Camera, Upload, Settings, Crosshair, Loader2, Trash2, RotateCcw, Share2, Download, Globe } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

function App() {
  const [imageData, setImageData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [hint, setHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [language, setLanguage] = useState("ru");
  const [sharing, setSharing] = useState(false);
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);
  const shareCanvasRef = useRef(null);

  const loadingMessages = useMemo(() => [
    "ESTABLISHING SECURE CONNECTION...",
    "DECRYPTING NIGHT CITY DATA...",
    "SCANNING NEURAL INTERFACE...",
    "ANALYZING COMBAT ZONE...",
    "PROCESSING VISUAL INPUT...",
  ], []);

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setImagePreview(result);
      setImageData(result.split(",")[1]);
      setHint(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const clearImage = useCallback(() => {
    setImageData(null);
    setImagePreview(null);
    setHint(null);
    if (cameraInputRef.current) cameraInputRef.current.value = "";
    if (galleryInputRef.current) galleryInputRef.current.value = "";
  }, []);

  const getHint = useCallback(async () => {
    if (!imageData) return;
    setLoading(true);
    setHint(null);
    let msgIdx = 0;
    setLoadingText(loadingMessages[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % loadingMessages.length;
      setLoadingText(loadingMessages[msgIdx]);
    }, 2000);
    try {
      const res = await axios.post(`${API}/analyze`, {
        image_base64: imageData,
        mime_type: "image/jpeg",
        language,
      });
      setHint(res.data.hint);
    } catch (err) {
      console.error("Analysis failed:", err);
      const detail = err.response?.data?.detail;
      if (err.response?.status === 402 || (detail && detail.toLowerCase().includes("budget"))) {
        setHint(language === "ru"
          ? "БЮДЖЕТ ИСЧЕРПАН // Пополните баланс Universal Key: Profile → Universal Key → Add Balance."
          : "BUDGET EXCEEDED // Please top up your Universal Key balance at Profile → Universal Key → Add Balance."
        );
      } else {
        setHint(language === "ru"
          ? "СОЕДИНЕНИЕ ПОТЕРЯНО // Не удалось связаться с серверами Найт-Сити. Попробуйте снова, чумба."
          : "CONNECTION LOST // Failed to reach Night City servers. Try again, choom."
        );
      }
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [imageData, language, loadingMessages]);

  const generateShareImage = useCallback(() => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const w = 1080;
      const h = 1080;
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");

      // Background
      ctx.fillStyle = "#050505";
      ctx.fillRect(0, 0, w, h);

      // Grid lines
      ctx.strokeStyle = "rgba(255, 0, 60, 0.08)";
      ctx.lineWidth = 1;
      for (let x = 0; x < w; x += 40) {
        ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
      }
      for (let y = 0; y < h; y += 40) {
        ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
      }

      // Top accent bar
      ctx.fillStyle = "#FCEE0A";
      ctx.fillRect(0, 0, w, 4);

      // Bottom accent bar
      ctx.fillStyle = "#FF003C";
      ctx.fillRect(0, h - 4, w, 4);

      // Corner markers
      const cornerSize = 24;
      ctx.fillStyle = "#FCEE0A";
      ctx.fillRect(40, 40, cornerSize, cornerSize);
      ctx.fillRect(w - 40 - cornerSize, h - 40 - cornerSize, cornerSize, cornerSize);
      ctx.fillStyle = "#FF003C";
      ctx.fillRect(w - 40 - cornerSize, 40, cornerSize, cornerSize);
      ctx.fillRect(40, h - 40 - cornerSize, cornerSize, cornerSize);

      // Title
      ctx.font = "bold 48px 'Orbitron', sans-serif";
      ctx.fillStyle = "#FCEE0A";
      ctx.textAlign = "center";
      ctx.fillText("NIGHT CITY", w / 2, 140);
      ctx.fillText("ASSISTANT", w / 2, 200);

      // Subtitle
      ctx.font = "16px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#A0A0A0";
      ctx.fillText("// CYBERPUNK 2077 AI COMPANION", w / 2, 240);

      // Divider
      ctx.strokeStyle = "rgba(252, 238, 10, 0.3)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(80, 270);
      ctx.lineTo(w - 80, 270);
      ctx.stroke();

      // Intel label
      ctx.font = "bold 14px 'Orbitron', sans-serif";
      ctx.fillStyle = "#FCEE0A";
      ctx.textAlign = "left";
      ctx.fillText("// INTEL RECEIVED", 80, 310);

      // Hint text - word wrap
      ctx.font = "18px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#00F0FF";
      ctx.textAlign = "left";
      const maxWidth = w - 160;
      const lineHeight = 30;
      const words = (hint || "").split(" ");
      let line = "";
      let y = 360;
      for (let i = 0; i < words.length; i++) {
        const testLine = line + words[i] + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && i > 0) {
          ctx.fillText(line.trim(), 80, y);
          line = words[i] + " ";
          y += lineHeight;
          if (y > h - 140) {
            ctx.fillText("...", 80, y);
            break;
          }
        } else {
          line = testLine;
        }
      }
      if (y <= h - 140) {
        ctx.fillText(line.trim(), 80, y);
      }

      // Bottom border box
      ctx.strokeStyle = "rgba(0, 240, 255, 0.2)";
      ctx.lineWidth = 1;
      ctx.strokeRect(60, 280, w - 120, y - 250);

      // Footer
      ctx.font = "12px 'JetBrains Mono', monospace";
      ctx.fillStyle = "#333";
      ctx.textAlign = "center";
      ctx.fillText("NIGHT CITY ASSISTANT // POWERED BY NEURAL AI", w / 2, h - 60);

      canvas.toBlob((blob) => resolve(blob), "image/png");
    });
  }, [hint]);

  const handleShare = useCallback(async () => {
    if (!hint) return;
    setSharing(true);
    try {
      const blob = await generateShareImage();
      const file = new File([blob], "night-city-hint.png", { type: "image/png" });

      if (navigator.share && navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          title: "Night City Assistant - Hint",
          text: hint,
          files: [file],
        });
      } else {
        // Fallback: download
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "night-city-hint.png";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Share failed:", err);
      }
    } finally {
      setSharing(false);
    }
  }, [hint, generateShareImage]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "ru" ? "en" : "ru"));
  }, []);

  return (
    <div className="app-container bg-cyber-grid" data-testid="app-container">
      <div className="bg-overlay" />
      <div className="scanline" />

      {/* Header */}
      <header className="app-header">
        <h1
          className="glitch font-['Orbitron'] text-2xl sm:text-3xl font-bold text-center text-[#FCEE0A] tracking-widest uppercase"
          data-text="NIGHT CITY ASSISTANT"
          data-testid="app-title"
        >
          NIGHT CITY ASSISTANT
        </h1>
        <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] text-center mt-2 tracking-wider uppercase">
          // cyberpunk 2077 ai companion
        </p>

        {/* Top-right controls */}
        <div className="absolute top-4 right-4 flex items-center gap-1 z-50">
          {/* Language toggle */}
          <button
            data-testid="language-toggle-btn"
            onClick={toggleLanguage}
            className="lang-toggle-btn"
            title={language === "ru" ? "Switch to English" : "Switch to Russian"}
          >
            <Globe size={14} />
            <span className="font-['JetBrains_Mono'] text-[10px] font-bold uppercase">
              {language === "ru" ? "RU" : "EN"}
            </span>
          </button>

          {/* Settings */}
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <button
                data-testid="settings-btn"
                className="text-[#00F0FF] hover:text-white transition-colors hover:rotate-90 duration-300 p-2"
              >
                <Settings size={22} />
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
      </header>

      {/* Main Content */}
      <main className="app-main">
        {!imagePreview ? (
          <div className="capture-section" data-testid="capture-section">
            <label className="camera-btn group" data-testid="camera-button">
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={handleImageSelect}
                data-testid="camera-input"
              />
              <div className="camera-btn-inner">
                <Camera size={48} className="text-[#FF003C] group-hover:scale-110 transition-transform" />
                <span className="font-['JetBrains_Mono'] text-xs text-[#FF003C] uppercase tracking-wider mt-1">
                  Capture
                </span>
              </div>
            </label>
            <div className="crosshair-top-left"><Crosshair size={14} className="text-[#FF003C]/40" /></div>
            <div className="crosshair-bottom-right"><Crosshair size={14} className="text-[#FF003C]/40" /></div>
            <label className="gallery-btn" data-testid="gallery-button">
              <input
                ref={galleryInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleImageSelect}
                data-testid="gallery-input"
              />
              <Upload size={16} className="text-[#00F0FF]" />
              <span className="font-['JetBrains_Mono'] text-xs text-[#00F0FF] uppercase tracking-wider">
                Upload Screenshot
              </span>
            </label>
          </div>
        ) : (
          <div className="preview-section" data-testid="preview-section">
            <div className="image-preview-wrapper">
              <img src={imagePreview} alt="Screenshot" className="image-preview" data-testid="image-preview" />
              <div className="corner-tl" />
              <div className="corner-tr" />
              <div className="corner-bl" />
              <div className="corner-br" />
            </div>
            <div className="flex gap-3 w-full">
              <button
                data-testid="get-hint-btn"
                className="get-hint-btn flex-1"
                onClick={getHint}
                disabled={loading}
              >
                {loading ? <Loader2 size={20} className="animate-spin" /> : (language === "ru" ? "ПОЛУЧИТЬ ПОДСКАЗКУ" : "GET HINT")}
              </button>
              <button
                data-testid="clear-image-btn"
                className="clear-btn"
                onClick={clearImage}
                disabled={loading}
              >
                <Trash2 size={18} />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="loading-container" data-testid="loading-indicator">
            <div className="loading-bar" />
            <p className="font-['JetBrains_Mono'] text-sm text-[#FF003C] animate-pulse">{loadingText}</p>
            <div className="loading-dots"><span /><span /><span /></div>
          </div>
        )}

        {/* Response Card */}
        {hint && !loading && (
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

            {/* Action buttons row */}
            <div className="flex gap-3 mt-4 flex-wrap">
              <button data-testid="try-again-btn" className="try-again-btn" onClick={getHint}>
                <RotateCcw size={14} />
                <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider">Re-analyze</span>
              </button>
              <button
                data-testid="share-hint-btn"
                className="share-hint-btn"
                onClick={handleShare}
                disabled={sharing}
              >
                {sharing ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Share2 size={14} />
                )}
                <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider">
                  {sharing ? "Generating..." : "Share Hint"}
                </span>
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Hidden canvas for share image */}
      <canvas ref={shareCanvasRef} className="hidden" />

      <footer className="app-footer">
        <p className="font-['JetBrains_Mono'] text-[10px] text-[#333] tracking-wider uppercase">
          v2.1.77 // powered by neural ai
        </p>
      </footer>
    </div>
  );
}

export default App;
