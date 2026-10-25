import { type Project, type Creative, LABELS, FORMAT_SPECS } from "./types";
export const escapeXml = (s: string) =>
  s.replace(
    /[<>&"']/g,
    (c) =>
      ({
        "<": "&lt;",
        ">": "&gt;",
        "&": "&amp;",
        '"': "&quot;",
        "'": "&apos;",
      })[c]!,
  );
function wrap(s: string, max: number, lines = 4) {
  const result: string[] = [];
  for (const paragraph of s.split("\n")) {
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if ((line + " " + word).trim().length > max && line) {
        result.push(line);
        line = word;
      } else line = (line + " " + word).trim();
    }
    if (line) result.push(line);
  }
  return result;
}
export function lightColor(hex: string) {
  const c = hex.replace("#", "");
  return (
    0.2126 * parseInt(c.slice(0, 2), 16) +
      0.7152 * parseInt(c.slice(2, 4), 16) +
      0.0722 * parseInt(c.slice(4, 6), 16) >
    165
  );
}
export function creativeSvg(c: Creative, p: Project, logoData = "") {
  const w = c.width,
    h = c.height,
    land = w / h > 1.5,
    tall = h / w > 1.5,
    scale = w / 1200;
  const color = /^#[a-f\d]{6}$/i.test(c.color) ? c.color : "#6e56cf";
  const light = lightColor(color),
    ink = light ? "#172b25" : "#ffffff",
    muted = light ? "#35473d" : "#eeeafc",
    accent = light ? "#325447" : "#d8f29c";
  const viewH = h / scale,
    margin = land ? 62 : 86,
    top = tall ? 225 : 76;
  let fs = land ? 66 : 85,
    lines = wrap(c.headline, land ? 20 : 23);
  while (lines.length > (land ? 3 : 4) && fs > 38) {
    fs -= 2;
    lines = wrap(c.headline, Math.floor((land ? 680 : 1020) / (fs * 0.55)));
  }
  const bodySize = land ? 21 : 26,
    bodyLines = wrap(
      c.body,
      Math.floor((land ? 700 : 1000) / (bodySize * 0.5)),
    );
  const text = (
    s: string,
    x: number,
    y: number,
    size: number,
    fill = ink,
    weight = 400,
  ) =>
    `<text x="${x}" y="${y}" fill="${fill}" font-family="Arial,Helvetica,sans-serif" font-size="${size}" font-weight="${weight}">${escapeXml(s)}</text>`;
  const brand = p.profile?.name || p.title;
  const titleY = top + (land ? 130 : 190),
    ctaY = land ? 548 : tall ? viewH - 260 : viewH - 90,
    artX = land ? 960 : 790,
    artY = land ? 285 : viewH * 0.7;
  let out = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}" viewBox="0 0 1200 ${h / scale}"><defs><linearGradient id="orb" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${accent}"/><stop offset="1" stop-color="${light ? "#a6b9a5" : "#9581f1"}"/></linearGradient></defs><rect width="1200" height="${h / scale}" fill="${color}"/>`;
  if (logoData)
    out += `<image x="${margin}" y="${top - 34}" width="190" height="64" preserveAspectRatio="xMinYMid meet" href="${logoData}"/>`;
  else
    out += `<circle cx="${margin + 15}" cy="${top - 13}" r="13" fill="none" stroke="${ink}" stroke-width="5"/>${text(brand, margin + 44, top, 36, ink, 700)}`;
  const shift = c.style % 4;
  out += `<g transform="translate(${artX} ${artY}) rotate(${shift * 19 - 20})" opacity=".95"><ellipse rx="${land ? 205 : 285}" ry="${land ? 92 : 130}" fill="none" stroke="url(#orb)" stroke-width="${shift === 2 ? 65 : 90}"/><ellipse rx="${land ? 205 : 285}" ry="${land ? 92 : 130}" fill="none" stroke="${accent}" stroke-width="${shift === 2 ? 65 : 90}" transform="rotate(70)" opacity=".7"/><circle cx="${land ? 150 : 210}" cy="${land ? -50 : -80}" r="${land ? 42 : 60}" fill="${accent}"/></g>`;
  lines.forEach(
    (line, i) =>
      (out += text(line, margin, titleY + i * fs * 1.09, fs, ink, 700)),
  );
  const by = titleY + lines.length * fs * 1.09 + 32;
  bodyLines.forEach(
    (line, i) =>
      (out += text(line, margin, by + i * (bodySize + 7), bodySize, muted)),
  );
  const buttonWidth = Math.min(450, Math.max(190, c.cta.length * 18 + 70));
  out += `<rect x="${margin}" y="${ctaY - 56}" width="${buttonWidth}" height="70" rx="35" fill="${ink}"/>${text(c.cta, margin + 30, ctaY - 10, 25, color, 700)}${text("↗", margin + buttonWidth - 42, ctaY - 10, 28, color)}`;
  if (p.disclaimer)
    out += text(
      p.disclaimer.slice(0, 115),
      margin,
      h / scale - (tall ? 200 : 34),
      15,
      muted,
    );
  return out + "</svg>";
}
export type Check = {
  label: string;
  level: "pass" | "warning" | "error";
  detail: string;
};
export function checks(c: Creative, p: Project): Check[] {
  const spec = FORMAT_SPECS[c.ratio];
  const claimText = [
    p.description,
    ...p.sources.map((s) => s.text),
    ...(p.profile?.claims.map((x) => x.text) || []),
  ]
    .join(" ")
    .toLowerCase();
  const text = [c.headline, c.body, c.cta].join(" ");
  const numbers = text.match(/\b\d+(?:[.,]\d+)?\s*[%xX]?/g) || [];
  const badNumbers = numbers.filter(
    (n) => !claimText.includes(n.toLowerCase()),
  );
  const forbidden = p.avoid
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean)
    .filter((x) => text.toLowerCase().includes(x.toLowerCase()));
  const names = p.competitors.filter((x) =>
    text.toLowerCase().includes(x.name.toLowerCase()),
  );
  const copied = p.evidence.some(
    (e) =>
      e.headline.length > 15 &&
      text.toLowerCase().includes(e.headline.toLowerCase()),
  );
  const context = p.contexts?.find((x) => x.id === c.contextId);
  const concept = (context?.concepts || p.concepts).find(
    (x) => x.id === c.conceptId,
  );
  const insight = concept?.insightIds.some(
    (id) =>
      (context?.report || p.report)?.insights.find((i) => i.id === id)
        ?.evidenceIds.length,
  );
  return [
    {
      label: "Image dimensions",
      level:
        spec && spec.width === c.width && spec.height === c.height
          ? "pass"
          : "error",
      detail: `${c.width} × ${c.height} · ${c.ratio}`,
    },
    {
      label: "Copy and safe zones",
      level:
        c.headline.length > 100 || c.body.length > 145 || c.cta.length > 24
          ? "error"
          : "pass",
      detail:
        "Bounded text; placement-aware margins. Review final raster before publishing.",
    },
    {
      label: "Verifiable numeric claims",
      level: badNumbers.length ? "error" : "pass",
      detail: badNumbers.length
        ? `Unverified: ${badNumbers.join(", ")}`
        : "No unsupported numeric claims detected.",
    },
    {
      label: "Campaign restrictions",
      level: forbidden.length || names.length || copied ? "error" : "pass",
      detail:
        forbidden.length || names.length || copied
          ? "Remove excluded wording, competitor names or copied headlines."
          : "No excluded wording or competitor names detected.",
    },
    {
      label: "Competitor evidence",
      level: insight ? "pass" : "warning",
      detail: insight
        ? "Linked to imported public-library evidence."
        : "No competitor evidence supports this concept. Treat as a creative hypothesis.",
    },
    {
      label: "Policy review",
      level: "warning",
      detail: /finance|health|legal|medical|invest/i.test(
        p.profile?.industry || "",
      )
        ? "Sensitive category: specialist review required."
        : "Automated checks are partial. Verify claims, imagery rights and current platform policy.",
    },
    {
      label: "Human approval",
      level: c.status === "approved" ? "pass" : "warning",
      detail:
        c.status === "approved"
          ? "Approved in this workspace."
          : "Awaiting your review.",
    },
  ];
}
export const filename = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "creative";
export async function raster(
  c: Creative,
  p: Project,
  type: "png" | "jpg" = "png",
  logo = "",
): Promise<Blob> {
  const svg = new Blob([creativeSvg(c, p, logo)], { type: "image/svg+xml" });
  const url = URL.createObjectURL(svg);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = c.width;
    canvas.height = c.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(image, 0, 0);
    const blob = await new Promise<Blob>((resolve, reject) =>
      canvas.toBlob(
        (b) => (b ? resolve(b) : reject(new Error("Image export failed"))),
        type === "png" ? "image/png" : "image/jpeg",
        0.9,
      ),
    );
    if (blob.size > 5 * 1024 * 1024)
      throw new Error("Image exceeds 5 MB; try JPG.");
    return blob;
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
// A small standards-compliant ZIP writer: no CDN, compression service or image upload.
export function zip(files: { name: string; data: Uint8Array }[]) {
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const header = (size: number) => {
    const a = new Uint8Array(size);
    return { a, v: new DataView(a.buffer) };
  };
  const crc = (bytes: Uint8Array) => {
    let c = 0xffffffff;
    for (const b of bytes) {
      c ^= b;
      for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (0xedb88320 & -(c & 1));
    }
    return (c ^ 0xffffffff) >>> 0;
  };
  for (const file of files) {
    const n = new TextEncoder().encode(file.name),
      checksum = crc(file.data);
    const { a, v } = header(30);
    v.setUint32(0, 0x04034b50, true);
    v.setUint16(4, 20, true);
    v.setUint16(6, 0x800, true);
    v.setUint32(14, checksum, true);
    v.setUint32(18, file.data.length, true);
    v.setUint32(22, file.data.length, true);
    v.setUint16(26, n.length, true);
    chunks.push(a, n, file.data);
    const z = header(46);
    z.v.setUint32(0, 0x02014b50, true);
    z.v.setUint16(4, 20, true);
    z.v.setUint16(6, 20, true);
    z.v.setUint16(8, 0x800, true);
    z.v.setUint32(16, checksum, true);
    z.v.setUint32(20, file.data.length, true);
    z.v.setUint32(24, file.data.length, true);
    z.v.setUint16(28, n.length, true);
    z.v.setUint32(42, offset, true);
    central.push(z.a, n);
    offset += 30 + n.length + file.data.length;
  }
  const size = central.reduce((a, b) => a + b.length, 0);
  const end = header(22);
  end.v.setUint32(0, 0x06054b50, true);
  end.v.setUint16(8, files.length, true);
  end.v.setUint16(10, files.length, true);
  end.v.setUint32(12, size, true);
  end.v.setUint32(16, offset, true);
  return new Blob([...chunks, ...central, end.a] as BlobPart[], {
    type: "application/zip",
  });
}
export function reportHtml(p: Project) {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeXml(p.title)}</title><style>body{font:16px Arial;max-width:850px;margin:60px auto;color:#24332d;line-height:1.7}section{border-bottom:1px solid #ddd;padding:24px 0}pre{white-space:pre-wrap;font:14px monospace}h1{font-size:36px}</style></head><body><p>SIGNAL STUDIO · RESEARCH & CREATIVE BRIEF</p><h1>${escapeXml(p.title)}</h1><p>${escapeXml(p.website || "Manual business input")} · ${escapeXml(p.updatedAt)}</p>${["Business profile", "Competitor insights", "Creative brief", "Evidence & provenance"].map((title, i) => `<section><h2>${title}</h2><pre>${escapeXml(JSON.stringify([p.profile, p.report, p.concepts, { sources: p.sources, evidence: p.evidence }][i], null, 2))}</pre></section>`).join("")}<p>Longevity is a hypothesis signal, not confirmed performance. Platform approval is not guaranteed.</p></body></html>`;
}
