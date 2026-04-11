import {
  CANVAS_SIZE,
  CANVAS_GRID_STEP,
  CANVAS_CORNER_SIZE,
  CANVAS_MARGIN,
  CANVAS_PADDING,
  CANVAS_TITLE_Y,
  CANVAS_TITLE2_Y,
  CANVAS_SUBTITLE_Y,
  CANVAS_DIVIDER_Y,
  CANVAS_BORDER_TOP_Y,
  CANVAS_LABEL_Y,
  CANVAS_TEXT_START_Y,
  CANVAS_BOTTOM_MARGIN,
  CANVAS_FOOTER_OFFSET,
  CANVAS_TEXT_LINE_HEIGHT,
  CANVAS_ACCENT_BAR_HEIGHT,
} from "@/constants";

function drawBackground(ctx, w, h) {
  ctx.fillStyle = "#050505";
  ctx.fillRect(0, 0, w, h);

  ctx.strokeStyle = "rgba(255, 0, 60, 0.08)";
  ctx.lineWidth = 1;
  for (let x = 0; x < w; x += CANVAS_GRID_STEP) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
  }
  for (let y = 0; y < h; y += CANVAS_GRID_STEP) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
  }

  ctx.fillStyle = "#FCEE0A";
  ctx.fillRect(0, 0, w, CANVAS_ACCENT_BAR_HEIGHT);
  ctx.fillStyle = "#FF003C";
  ctx.fillRect(0, h - CANVAS_ACCENT_BAR_HEIGHT, w, CANVAS_ACCENT_BAR_HEIGHT);
}

function drawCorners(ctx, w, h) {
  ctx.fillStyle = "#FCEE0A";
  ctx.fillRect(CANVAS_MARGIN, CANVAS_MARGIN, CANVAS_CORNER_SIZE, CANVAS_CORNER_SIZE);
  ctx.fillRect(w - CANVAS_MARGIN - CANVAS_CORNER_SIZE, h - CANVAS_MARGIN - CANVAS_CORNER_SIZE, CANVAS_CORNER_SIZE, CANVAS_CORNER_SIZE);
  ctx.fillStyle = "#FF003C";
  ctx.fillRect(w - CANVAS_MARGIN - CANVAS_CORNER_SIZE, CANVAS_MARGIN, CANVAS_CORNER_SIZE, CANVAS_CORNER_SIZE);
  ctx.fillRect(CANVAS_MARGIN, h - CANVAS_MARGIN - CANVAS_CORNER_SIZE, CANVAS_CORNER_SIZE, CANVAS_CORNER_SIZE);
}

function drawHeader(ctx, w) {
  ctx.font = "bold 48px 'Orbitron', sans-serif";
  ctx.fillStyle = "#FCEE0A";
  ctx.textAlign = "center";
  ctx.fillText("NIGHT CITY", w / 2, CANVAS_TITLE_Y);
  ctx.fillText("ASSISTANT", w / 2, CANVAS_TITLE2_Y);

  ctx.font = "16px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#A0A0A0";
  ctx.fillText("// CYBERPUNK 2077 AI COMPANION", w / 2, CANVAS_SUBTITLE_Y);

  ctx.strokeStyle = "rgba(252, 238, 10, 0.3)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(CANVAS_PADDING, CANVAS_DIVIDER_Y);
  ctx.lineTo(w - CANVAS_PADDING, CANVAS_DIVIDER_Y);
  ctx.stroke();

  ctx.font = "bold 14px 'Orbitron', sans-serif";
  ctx.fillStyle = "#FCEE0A";
  ctx.textAlign = "left";
  ctx.fillText("// INTEL RECEIVED", CANVAS_PADDING, CANVAS_LABEL_Y);
}

function drawHintText(ctx, w, h, hintText) {
  ctx.font = "18px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#00F0FF";
  ctx.textAlign = "left";
  const maxWidth = w - CANVAS_PADDING * 2;
  const words = (hintText || "").split(" ");
  let line = "";
  let y = CANVAS_TEXT_START_Y;

  for (let i = 0; i < words.length; i++) {
    const testLine = line + words[i] + " ";
    const metrics = ctx.measureText(testLine);
    if (metrics.width > maxWidth && i > 0) {
      ctx.fillText(line.trim(), CANVAS_PADDING, y);
      line = words[i] + " ";
      y += CANVAS_TEXT_LINE_HEIGHT;
      if (y > h - CANVAS_BOTTOM_MARGIN) {
        ctx.fillText("...", CANVAS_PADDING, y);
        break;
      }
    } else {
      line = testLine;
    }
  }
  if (y <= h - CANVAS_BOTTOM_MARGIN) {
    ctx.fillText(line.trim(), CANVAS_PADDING, y);
  }

  ctx.strokeStyle = "rgba(0, 240, 255, 0.2)";
  ctx.lineWidth = 1;
  const borderPadding = CANVAS_PADDING - 20;
  ctx.strokeRect(borderPadding, CANVAS_BORDER_TOP_Y, w - borderPadding * 2, y - CANVAS_BORDER_TOP_Y + 30);
}

function drawFooter(ctx, w, h) {
  ctx.font = "12px 'JetBrains Mono', monospace";
  ctx.fillStyle = "#333";
  ctx.textAlign = "center";
  ctx.fillText("NIGHT CITY ASSISTANT // POWERED BY NEURAL AI", w / 2, h - CANVAS_FOOTER_OFFSET);
}

export function generateShareImage(hintText) {
  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    const w = CANVAS_SIZE;
    const h = CANVAS_SIZE;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");

    drawBackground(ctx, w, h);
    drawCorners(ctx, w, h);
    drawHeader(ctx, w);
    drawHintText(ctx, w, h, hintText);
    drawFooter(ctx, w, h);

    canvas.toBlob((blob) => resolve(blob), "image/png");
  });
}

export async function shareOrDownload(hintText) {
  const blob = await generateShareImage(hintText);
  const file = new File([blob], "night-city-hint.png", { type: "image/png" });

  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      title: "Night City Assistant - Hint",
      text: hintText,
      files: [file],
    });
  } else {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "night-city-hint.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}
