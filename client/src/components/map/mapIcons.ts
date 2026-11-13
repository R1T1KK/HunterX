import mapboxgl from "mapbox-gl";

/**
 * Creates tactical SVG-based icons for Hunters and Runners
 * and registers them with the Mapbox GL JS instance.
 */
export function registerMapTacticalIcons(map: mapboxgl.Map): void {
  // 1. Hunter Tactical Icon (Crimson Red with Direction Chevron)
  if (!map.hasImage("hunter-marker")) {
    const hunterCanvas = document.createElement("canvas");
    hunterCanvas.width = 44;
    hunterCanvas.height = 44;
    const ctx = hunterCanvas.getContext("2d");

    if (ctx) {
      // Glow/Drop Shadow
      ctx.shadowColor = "rgba(255, 59, 48, 0.7)";
      ctx.shadowBlur = 8;

      // Outer Red Ring
      ctx.beginPath();
      ctx.arc(22, 22, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#FF3B30";
      ctx.fill();

      // Inner Dark Core
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(22, 22, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#121620";
      ctx.fill();

      // Center White Crosshair Dot
      ctx.beginPath();
      ctx.arc(22, 22, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      // Top Directional Pointer Arrow (Pointing North 0 deg)
      ctx.beginPath();
      ctx.moveTo(22, 2);
      ctx.lineTo(27, 10);
      ctx.lineTo(17, 10);
      ctx.closePath();
      ctx.fillStyle = "#FF3B30";
      ctx.fill();

      const imgData = ctx.getImageData(0, 0, 44, 44);
      map.addImage("hunter-marker", imgData, { pixelRatio: 2 });
    }
  }

  // 2. Runner Tactical Icon (Neon Cyan Blue with Direction Chevron)
  if (!map.hasImage("runner-marker")) {
    const runnerCanvas = document.createElement("canvas");
    runnerCanvas.width = 44;
    runnerCanvas.height = 44;
    const ctx = runnerCanvas.getContext("2d");

    if (ctx) {
      // Glow/Drop Shadow
      ctx.shadowColor = "rgba(0, 240, 255, 0.7)";
      ctx.shadowBlur = 8;

      // Outer Cyan Ring
      ctx.beginPath();
      ctx.arc(22, 22, 14, 0, Math.PI * 2);
      ctx.fillStyle = "#00F0FF";
      ctx.fill();

      // Inner Dark Core
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.arc(22, 22, 9, 0, Math.PI * 2);
      ctx.fillStyle = "#0C1726";
      ctx.fill();

      // Center White Dot
      ctx.beginPath();
      ctx.arc(22, 22, 4, 0, Math.PI * 2);
      ctx.fillStyle = "#FFFFFF";
      ctx.fill();

      // Top Directional Pointer Arrow (Pointing North 0 deg)
      ctx.beginPath();
      ctx.moveTo(22, 2);
      ctx.lineTo(27, 10);
      ctx.lineTo(17, 10);
      ctx.closePath();
      ctx.fillStyle = "#00F0FF";
      ctx.fill();

      const imgData = ctx.getImageData(0, 0, 44, 44);
      map.addImage("runner-marker", imgData, { pixelRatio: 2 });
    }
  }
}
