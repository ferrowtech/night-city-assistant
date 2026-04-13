import { useState, useRef, useCallback, useMemo } from "react";
import "@/App.css";
import axios from "axios";
import { API_BASE, HTTP_PAYMENT_REQUIRED, LOADING_INTERVAL_MS } from "@/constants";
import { i18n } from "@/lib/i18n";
import { compressImage } from "@/lib/compress-image";
import { shareOrDownload } from "@/lib/share-image";
import { CaptureSection } from "@/components/CaptureSection";
import { PreviewSection } from "@/components/PreviewSection";
import { ResponseCard } from "@/components/ResponseCard";
import { LoadingState } from "@/components/LoadingState";
import { HeaderControls } from "@/components/HeaderControls";

function App() {
  const [imageData, setImageData] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [hint, setHint] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingText, setLoadingText] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [language, setLanguage] = useState("en");
  const [sharing, setSharing] = useState(false);
  const [promoCode, setPromoCode] = useState(() => localStorage.getItem("nc_promo") || "");
  const isPremium = promoCode.length > 0;
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

  const lang = useMemo(() => i18n(language), [language]);

  const handleImageSelect = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (event) => {
      const rawDataUrl = event.target.result;
      const compressed = await compressImage(rawDataUrl);
      setImagePreview(compressed);
      setImageData(compressed.split(",")[1]);
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

  const sendToAPI = useCallback(async (userQuestion) => {
    if (!imageData) return;
    setLoading(true);
    const msgs = lang.loading;
    let msgIdx = 0;
    setLoadingText(msgs[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % msgs.length;
      setLoadingText(msgs[msgIdx]);
    }, LOADING_INTERVAL_MS);
    try {
      const res = await axios.post(`${API_BASE}/analyze`, {
        image_base64: imageData,
        mime_type: "image/jpeg",
        language,
        user_question: userQuestion || "",
        promo_code: promoCode,
      });
      setHint(res.data.hint);
    } catch (err) {
      const status = err.response?.status;
      const detail = err.response?.data?.detail;
      const isBudgetError = status === HTTP_PAYMENT_REQUIRED
        || (detail && detail.toLowerCase().includes("budget"));
      const isRateLimited = status === 429;
      if (isRateLimited) {
        setHint("__RATE_LIMITED__");
      } else {
        setHint(isBudgetError ? lang.budgetError : lang.connectionError);
      }
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  }, [imageData, language, lang, promoCode]);

  const getHint = useCallback(() => {
    sendToAPI("");
  }, [sendToAPI]);

  const handleFollowUp = useCallback((question) => {
    sendToAPI(question);
  }, [sendToAPI]);

  const handleShare = useCallback(async () => {
    if (!hint) return;
    setSharing(true);
    try {
      await shareOrDownload(hint);
    } catch (err) {
      if (err.name !== "AbortError") {
        // Share cancelled silently
      }
    } finally {
      setSharing(false);
    }
  }, [hint]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "ru" ? "en" : "ru"));
  }, []);

  const handlePromoActivate = useCallback((code) => {
    localStorage.setItem("nc_promo", code);
    setPromoCode(code);
  }, []);

  return (
    <div className="app-container bg-cyber-grid" data-testid="app-container">
      <div className="bg-overlay" />
      <div className="scanline" />

      <header className="app-header">
        <h1
          className="glitch font-['Orbitron'] text-2xl sm:text-3xl font-bold text-center text-[#FCEE0A] tracking-widest uppercase"
          data-text="NIGHT CITY ASSISTANT"
          data-testid="app-title"
        >
          NIGHT CITY ASSISTANT
        </h1>
        <p className="font-['JetBrains_Mono'] text-xs text-[#A0A0A0] text-center mt-2 tracking-wider uppercase">
          {lang.subtitle}
        </p>
        <HeaderControls
          language={language}
          lang={lang}
          onToggleLanguage={toggleLanguage}
          settingsOpen={settingsOpen}
          onSettingsChange={setSettingsOpen}
          isPremium={isPremium}
          onPromoActivate={handlePromoActivate}
        />
      </header>

      <main className="app-main">
        {!imagePreview ? (
          <CaptureSection
            lang={lang}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            onImageSelect={handleImageSelect}
          />
        ) : (
          <PreviewSection
            imagePreview={imagePreview}
            loading={loading}
            lang={lang}
            onGetHint={getHint}
            onClear={clearImage}
          />
        )}

        {loading && <LoadingState loadingText={loadingText} />}

        {hint && !loading && (
          <ResponseCard
            hint={hint}
            sharing={sharing}
            loading={loading}
            onRetry={getHint}
            onShare={handleShare}
            onFollowUp={handleFollowUp}
            lang={lang}
          />
        )}
      </main>

      <footer className="app-footer">
        <p className="font-['JetBrains_Mono'] text-[10px] text-[#333] tracking-wider uppercase">
          {lang.footer}
        </p>
      </footer>
    </div>
  );
}

export default App;
