import { Camera, Crosshair, Upload } from "lucide-react";
import { ICON_CAMERA, ICON_SMALL, ICON_MEDIUM } from "@/constants";

export function CaptureSection({ language, cameraInputRef, galleryInputRef, onImageSelect }) {
  return (
    <div className="capture-section" data-testid="capture-section">
      <label className="camera-btn group" data-testid="camera-button">
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={onImageSelect}
          data-testid="camera-input"
        />
        <div className="camera-btn-inner">
          <Camera size={ICON_CAMERA} className="text-[#FF003C] group-hover:scale-110 transition-transform" />
          <span className="font-['JetBrains_Mono'] text-xs text-[#FF003C] uppercase tracking-wider mt-1">
            {language === "ru" ? "Снимок" : "Capture"}
          </span>
        </div>
      </label>
      <div className="crosshair-top-left"><Crosshair size={ICON_SMALL} className="text-[#FF003C]/40" /></div>
      <div className="crosshair-bottom-right"><Crosshair size={ICON_SMALL} className="text-[#FF003C]/40" /></div>
      <label className="gallery-btn" data-testid="gallery-button">
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={onImageSelect}
          data-testid="gallery-input"
        />
        <Upload size={ICON_MEDIUM} className="text-[#00F0FF]" />
        <span className="font-['JetBrains_Mono'] text-xs text-[#00F0FF] uppercase tracking-wider">
          {language === "ru" ? "Загрузить скриншот" : "Upload Screenshot"}
        </span>
      </label>
    </div>
  );
}
