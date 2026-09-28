import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";

const INK = rgb(0.145, 0.137, 0.129);
const MUTED = rgb(0.467, 0.443, 0.42);
const ORANGE = rgb(0.851, 0.467, 0.341);
const GREEN = rgb(0.42, 0.561, 0.443);
const LINE = rgb(0.91, 0.886, 0.847);
const CREAM = rgb(0.969, 0.953, 0.918);

// Characters available in WinAnsi (standard PDF fonts) beyond Latin-1.
const CP1252_EXTRA = "€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ";

/** Make text safe for standard PDF fonts. */
export function pdfSafe(s: string) {
  return s
    .replace(/₹\s?/g, "Rs. ")
    .replace(/[→➜]/g, "->")
    .replace(/[✓✔]/g, "v")
    .split("")
    .map((c) => (c === "\n" || (c.charCodeAt(0) >= 32 && c.charCodeAt(0) < 256) || CP1252_EXTRA.includes(c) ? c : "?"))
    .join("");
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  for (const para of pdfSafe(text).split("\n")) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of para.split(/(\s+)/)) {
      const test = line + word;
      if (font.widthOfTextAtSize(test, size) > maxWidth && line.trim()) {
        lines.push(line.trimEnd());
        line = word.trimStart();
      } else line = test;
    }
    lines.push(line.trimEnd());
  }
  return lines;
}

/** Tiny layout helper with automatic page breaks. */
export class PdfWriter {
  doc!: PDFDocument;
  page!: PDFPage;
  regular!: PDFFont;
  bold!: PDFFont;
  serif!: PDFFont;
  y = 0;
  readonly margin = 52;
  readonly width = 595.28;
  readonly height = 841.89;

  static async create() {
    const w = new PdfWriter();
    w.doc = await PDFDocument.create();
    w.regular = await w.doc.embedFont(StandardFonts.Helvetica);
    w.bold = await w.doc.embedFont(StandardFonts.HelveticaBold);
    w.serif = await w.doc.embedFont(StandardFonts.TimesRoman);
    w.addPage();
    return w;
  }

  get contentWidth() {
    return this.width - this.margin * 2;
  }

  addPage() {
    this.page = this.doc.addPage([this.width, this.height]);
    this.y = this.height - this.margin;
  }

  ensure(space: number) {
    if (this.y - space < this.margin + 20) this.addPage();
  }

  text(t: string, opts: { x?: number; size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; align?: "left" | "right"; maxWidth?: number } = {}) {
    const size = opts.size ?? 10;
    const font = opts.font ?? this.regular;
    const safe = pdfSafe(t);
    let x = opts.x ?? this.margin;
    if (opts.align === "right") x = (opts.x ?? this.width - this.margin) - font.widthOfTextAtSize(safe, size);
    this.page.drawText(safe, { x, y: this.y, size, font, color: opts.color ?? INK });
  }

  paragraph(t: string, opts: { size?: number; font?: PDFFont; color?: ReturnType<typeof rgb>; lineHeight?: number; x?: number; maxWidth?: number } = {}) {
    const size = opts.size ?? 10;
    const font = opts.font ?? this.regular;
    const lh = opts.lineHeight ?? size * 1.5;
    for (const line of wrap(t, font, size, opts.maxWidth ?? this.contentWidth)) {
      this.ensure(lh);
      if (line) this.page.drawText(line, { x: opts.x ?? this.margin, y: this.y, size, font, color: opts.color ?? INK });
      this.y -= lh;
    }
  }

  rule(color = LINE) {
    this.page.drawLine({ start: { x: this.margin, y: this.y }, end: { x: this.width - this.margin, y: this.y }, thickness: 0.8, color });
  }

  box(h: number, color = CREAM) {
    this.page.drawRectangle({ x: this.margin, y: this.y - h, width: this.contentWidth, height: h, color });
  }

  header(agency: { name: string; tagline: string }, label: string, number?: string) {
    this.text(agency.name, { size: 20, font: this.bold });
    this.text(label.toUpperCase(), { size: 9, font: this.bold, color: ORANGE, align: "right" });
    this.y -= 14;
    this.text(agency.tagline, { size: 8.5, color: MUTED });
    if (number) this.text(number, { size: 16, font: this.serif, align: "right" });
    this.y -= 26;
    this.rule();
    this.y -= 24;
  }

  footer(note: string) {
    const pages = this.doc.getPages();
    pages.forEach((p, i) => {
      p.drawText(pdfSafe(`${note}   ·   Page ${i + 1} of ${pages.length}`), { x: this.margin, y: 28, size: 7.5, font: this.regular, color: MUTED });
    });
  }

  save() {
    return this.doc.save();
  }
}

export const PDF_COLORS = { INK, MUTED, ORANGE, GREEN, LINE, CREAM };
