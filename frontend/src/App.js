import { useState, useRef, useCallback } from "react";
import "@/App.css";
import axios from "axios";
import { API_BASE, HTTP_PAYMENT_REQUIRED, LOADING_MESSAGES, LOADING_INTERVAL_MS } from "@/constants";
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
  const [userQuestion, setUserQuestion] = useState("");
  const cameraInputRef = useRef(null);
  const galleryInputRef = useRef(null);

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
    setLoadingText(LOADING_MESSAGES[0]);
    const interval = setInterval(() => {
      msgIdx = (msgIdx + 1) % LOADING_MESSAGES.length;
      setLoadingText(LOADING_MESSAGES[msgIdx]);
    }, LOADING_INTERVAL_MS);
    try {
      const res = await axios.post(`${API_BASE}/analyze`, {
        image_base64: imageData,
        mime_type: "image/jpeg",
        language,
        user_question: userQuestion || "",
      });
      setHint(res.data.hint);
    } catch (err) {
      const detail = err.response?.data?.detail;
      const isBudgetError = err.response?.status === HTTP_PAYMENT_REQUIRED
        || (detail && detail.toLowerCase().includes("budget"));
      if (isBudgetError) {
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
  }, [imageData, language, userQuestion]);

  const handleShare = useCallback(async () => {
    if (!hint) return;
    setSharing(true);
    try {
      await shareOrDownload(hint);
    } catch (err) {
      if (err.name !== "AbortError") {
        // Share was cancelled or failed silently
      }
    } finally {
      setSharing(false);
    }
  }, [hint]);

  const toggleLanguage = useCallback(() => {
    setLanguage((prev) => (prev === "ru" ? "en" : "ru"));
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
          // cyberpunk 2077 ai companion
        </p>
        <HeaderControls
          language={language}
          onToggleLanguage={toggleLanguage}
          settingsOpen={settingsOpen}
          onSettingsChange={setSettingsOpen}
        />
      </header>

      <main className="app-main">
        {!imagePreview ? (
          <CaptureSection
            language={language}
            cameraInputRef={cameraInputRef}
            galleryInputRef={galleryInputRef}
            onImageSelect={handleImageSelect}
          />
        ) : (
          <PreviewSection
            imagePreview={imagePreview}
            userQuestion={userQuestion}
            onQuestionChange={setUserQuestion}
            loading={loading}
            language={language}
            onGetHint={getHint}
            onClear={clearImage}
          />
        )}

        {loading && <LoadingState loadingText={loadingText} />}

        {hint && !loading && (
          <ResponseCard
            hint={hint}
            sharing={sharing}
            onRetry={getHint}
            onShare={handleShare}
          />
        )}
      </main>

      <footer className="app-footer">
        <p className="font-['JetBrains_Mono'] text-[10px] text-[#333] tracking-wider uppercase">
          v2.1.77 // powered by neural ai
        </p>
      </footer>
    </div>
  );
}

export default App;
