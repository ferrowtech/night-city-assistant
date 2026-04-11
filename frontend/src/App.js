import { useState, useRef, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { Camera, Upload, Settings, Crosshair, Loader2, Trash2, RotateCcw } from "lucide-react";
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
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const loadingMessages = [
    "ESTABLISHING SECURE CONNECTION...",
    "DECRYPTING NIGHT CITY DATA...",
    "SCANNING NEURAL INTERFACE...",
    "ANALYZING COMBAT ZONE...",
    "PROCESSING VISUAL INPUT...",
  ];

  const handleImageSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target.result;
      setImagePreview(result);
      const base64 = result.split(",")[1];
      setImageData(base64);
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
      });
      setHint(res.data.hint);
    } catch (err) {
      console.error("Analysis failed:", err);
      setHint("CONNECTION LOST // Failed to reach Night City servers. Try again, choom.");
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [imageData]);

  return (
    <div className="app-container bg-cyber-grid" data-testid="app-container">
      {/* Background overlay */}
      <div className="bg-overlay" />

      {/* Scanline effect */}
      <div className="scanline" />

      {/* Header */}
      <header className="app-header">
        <h1
          className="glitch font-['Orbitron'] text-4xl sm:text-5xl font-bold text-center text-[#FCEE0A] tracking-widest uppercase"
          data-text="NIGHT CITY ASSISTANT"
          data-testid="app-title"
        >
          NIGHT CITY ASSISTANT
        </h1>
        <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] text-center mt-2 tracking-wider uppercase">
          // cyberpunk 2077 ai companion
        </p>

        {/* Settings button */}
        <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
          <DialogTrigger asChild>
            <button
              data-testid="settings-btn"
              className="absolute top-4 right-4 text-[#00F0FF] hover:text-white transition-colors hover:rotate-90 duration-300 z-50 p-2"
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
                // Night City Assistant v2.0.77
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="border border-[#333] p-4">
                <p className="font-['JetBrains_Mono'] text-xs text-[#00F0FF] mb-2">STATUS:</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#00FF41] animate-pulse" />
                  <span className="font-['JetBrains_Mono'] text-xs text-[#00FF41]">
                    NEURAL LINK ACTIVE
                  </span>
                </div>
                <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] mt-3">
                  AI Model: Claude Sonnet 4
                </p>
                <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] mt-1">
                  Protocol: Emergent Universal Key
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
                  3. Get specific, actionable advice for your current situation
                </p>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </header>

      {/* Main Content */}
      <main className="app-main">
        {!imagePreview ? (
          /* Camera / Upload Section */
          <div className="capture-section" data-testid="capture-section">
            {/* Camera Button */}
            <label
              className="camera-btn group"
              data-testid="camera-button"
            >
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

            {/* Crosshair decorators */}
            <div className="crosshair-top-left"><Crosshair size={14} className="text-[#FF003C]/40" /></div>
            <div className="crosshair-bottom-right"><Crosshair size={14} className="text-[#FF003C]/40" /></div>

            {/* Gallery Upload */}
            <label
              className="gallery-btn"
              data-testid="gallery-button"
            >
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
          /* Image Preview + Actions */
          <div className="preview-section" data-testid="preview-section">
            <div className="image-preview-wrapper">
              <img
                src={imagePreview}
                alt="Screenshot"
                className="image-preview"
                data-testid="image-preview"
              />
              {/* Corner markers */}
              <div className="corner-tl" />
              <div className="corner-tr" />
              <div className="corner-bl" />
              <div className="corner-br" />
            </div>

            <div className="flex gap-3 w-full">
              {/* Get Hint button */}
              <button
                data-testid="get-hint-btn"
                className="get-hint-btn flex-1"
                onClick={getHint}
                disabled={loading}
              >
                {loading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  "GET HINT"
                )}
              </button>

              {/* Clear button */}
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
            <p className="font-['JetBrains_Mono'] text-sm text-[#FF003C] animate-pulse">
              {loadingText}
            </p>
            <div className="loading-dots">
              <span /><span /><span />
            </div>
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
            {/* Corner markers */}
            <div className="response-corner-tl" />
            <div className="response-corner-br" />

            {/* Try again */}
            <button
              data-testid="try-again-btn"
              className="try-again-btn"
              onClick={getHint}
            >
              <RotateCcw size={14} />
              <span className="font-['JetBrains_Mono'] text-xs uppercase tracking-wider">
                Re-analyze
              </span>
            </button>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="app-footer">
        <p className="font-['JetBrains_Mono'] text-[10px] text-[#333] tracking-wider uppercase">
          v2.0.77 // powered by neural ai
        </p>
      </footer>
    </div>
  );
}

export default App;
