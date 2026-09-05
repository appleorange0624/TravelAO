/**
 * Browser-side Excel (.xlsx) and PowerPoint (.pptx) export — no CDN libraries.
 * Files are valid OOXML (WPS / Excel / PowerPoint / Keynote).
 */

import { t } from "./i18n.js?v=rich6";
import { buildDaySummaries, slotText } from "./trip-dates.js?v=rich6";

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(bytes) {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function encodeUtf8(str) {
  return new TextEncoder().encode(str);
}

function concat(parts) {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

function u16(n) {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function u32(n) {
  const b = new Uint8Array(4);
  new DataView(b.buffer).setUint32(0, n, true);
  return b;
}

function zipStore(files) {
  const locals = [];
  const centrals = [];
  let offset = 0;
  for (const f of files) {
    const name = encodeUtf8(f.name.replace(/\\/g, "/"));
    const data = typeof f.data === "string" ? encodeUtf8(f.data) : f.data;
    const crc = crc32(data);
    const local = concat([
      u32(0x04034b50),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      name,
      data,
    ]);
    const central = concat([
      u32(0x02014b50),
      u16(20),
      u16(20),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(crc),
      u32(data.length),
      u32(data.length),
      u16(name.length),
      u16(0),
      u16(0),
      u16(0),
      u16(0),
      u32(0),
      u32(offset),
      name,
    ]);
    locals.push(local);
    centrals.push(central);
    offset += local.length;
  }
  const central = concat(centrals);
  const eocd = concat([
    u32(0x06054b50),
    u16(0),
    u16(0),
    u16(files.length),
    u16(files.length),
    u32(central.length),
    u32(offset),
    u16(0),
  ]);
  return concat([...locals, central, eocd]);
}

function xml(s) {
  return String(s ?? "")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, " ")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function xmlText(s) {
  return xml(s).replace(/\r?\n/g, " ");
}

function downloadBytes(filename, bytes, mime) {
  const blob = new Blob([bytes], { type: mime });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

function fileSlug(s) {
  return (
    String(s || "trip")
      .replace(/[^\w\u4e00-\u9fff\-]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .slice(0, 40) || "trip"
  );
}

function dash(v) {
  const s = String(v ?? "").trim();
  return s || "—";
}

function colName(i) {
  let n = i + 1;
  let s = "";
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

function sheetXml(rows, colWidths, wrap = false) {
  const cols = colWidths
    .map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`)
    .join("");
  const sheetData = rows
    .map((row, r) => {
      const cells = row
        .map((val, c) => {
          const ref = `${colName(c)}${r + 1}`;
          const style = r === 0 ? ' s="1"' : wrap ? ' s="2"' : "";
          return `<c r="${ref}" t="inlineStr"${style}><is><t xml:space="preserve">${xmlText(val)}</t></is></c>`;
        })
        .join("");
      const ht = r === 0 ? "" : wrap ? ' ht="64" customHeight="1"' : "";
      return `<row r="${r + 1}"${ht}>${cells}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>
  <cols>${cols}</cols>
  <sheetData>${sheetData}</sheetData>
</worksheet>`;
}

const XLSX_STYLES = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <fonts count="2">
    <font><sz val="11"/><color theme="1"/><name val="Calibri"/><family val="2"/></font>
    <font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/><family val="2"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF2F5D50"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>
  <cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>
  <cellXfs count="3">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0" applyAlignment="1"><alignment wrapText="1" vertical="top"/></xf>
  </cellXfs>
</styleSheet>`;

function buildXlsx(model, lang) {
  const days = buildDaySummaries(model);
  const overviewHeader = [
    t("colDay", lang),
    t("colDate", lang),
    t("colCountry", lang),
    t("colCity", lang),
    t("colStay", lang),
    t("colTransport", lang),
    t("colMainDest", lang),
    t("dayMorning", lang),
    t("dayAfternoon", lang),
    t("dayEvening", lang),
  ];
  const overviewRows = [
    overviewHeader,
    ...days.map((d) => [
      d.day,
      d.date,
      dash(d.country),
      dash(d.city),
      dash(d.accommodation),
      dash(d.transportation),
      dash(d.mainDestination),
      dash(slotText(d, "morning")),
      dash(slotText(d, "afternoon")),
      dash(slotText(d, "evening")),
    ]),
  ];

  const detailHeader = [
    t("colDay", lang),
    t("colDate", lang),
    t("colTime", lang),
    t("colLocation", lang),
    t("colActivity", lang),
    t("colTransport", lang),
    t("colStay", lang),
  ];
  const detailRows = [detailHeader];
  for (const d of days) {
    for (const slot of d.slots || []) {
      detailRows.push([
        d.day,
        d.date,
        `${slot.time || ""} ${slot.timeLabel || ""}`.trim(),
        dash(slot.location),
        dash(slot.activity),
        dash(slot.transport),
        dash(d.accommodation),
      ]);
    }
  }

  const budgetHeader = [t("colCategory", lang), t("colEstimate", lang), t("colNotes", lang)];
  const budgetRows = [
    budgetHeader,
    ...(model.budget || []).map((b) => [b.category, b.estimate, b.notes]),
  ];

  const sheetNames = {
    overview: lang === "zh" ? "行程概览" : "Overview",
    details: lang === "zh" ? "每日明细" : "Daily details",
    budget: lang === "zh" ? "预算" : "Budget",
  };

  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet2.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/worksheets/sheet3.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      name: "xl/_rels/workbook.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet2.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet3.xml"/>
  <Relationship Id="rId4" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      name: "xl/workbook.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="${xml(sheetNames.overview)}" sheetId="1" r:id="rId1"/>
    <sheet name="${xml(sheetNames.details)}" sheetId="2" r:id="rId2"/>
    <sheet name="${xml(sheetNames.budget)}" sheetId="3" r:id="rId3"/>
  </sheets>
</workbook>`,
    },
    { name: "xl/styles.xml", data: XLSX_STYLES },
    { name: "xl/worksheets/sheet1.xml", data: sheetXml(overviewRows, [10, 22, 12, 14, 22, 28, 20, 36, 36, 36], true) },
    { name: "xl/worksheets/sheet2.xml", data: sheetXml(detailRows, [12, 22, 18, 24, 48, 32, 24], true) },
    { name: "xl/worksheets/sheet3.xml", data: sheetXml(budgetRows, [18, 16, 36], true) },
    {
      name: "docProps/core.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <dc:title>${xml(model.meta?.title || "TravelAO")}</dc:title>
  <dc:creator>TravelAO</dc:creator>
</cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>TravelAO</Application>
</Properties>`,
    },
  ];
  return zipStore(files);
}

function wrapLines(text, max = 90) {
  const raw = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) return ["—"];
  if (raw.length <= max) return [raw];
  const words = raw.split(" ");
  const lines = [];
  let cur = "";
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length > max && cur) {
      lines.push(cur);
      cur = w;
    } else cur = next;
  }
  if (cur) lines.push(cur);
  return lines.slice(0, 8);
}

function shapeText(id, name, x, y, w, h, lines, opts = {}) {
  const size = opts.size || 1400;
  const color = opts.color || "1A1A1A";
  const bold = opts.bold ? ' b="1"' : "";
  const align = opts.align || "l";
  const paras = (lines.length ? lines : [""])
    .map(
      (text) => `
      <a:p>
        <a:pPr algn="${align}"/>
        <a:r>
          <a:rPr lang="en-US" altLang="zh-CN" sz="${size}"${bold} dirty="0">
            <a:solidFill><a:srgbClr val="${color}"/></a:solidFill>
            <a:latin typeface="Calibri"/>
            <a:ea typeface="Microsoft YaHei"/>
          </a:rPr>
          <a:t>${xmlText(text)}</a:t>
        </a:r>
      </a:p>`
    )
    .join("");
  const fill = opts.fill
    ? `<a:solidFill><a:srgbClr val="${opts.fill}"/></a:solidFill>`
    : "<a:noFill/>";
  const ln = opts.line
    ? `<a:ln w="6350"><a:solidFill><a:srgbClr val="${opts.line}"/></a:solidFill></a:ln>`
    : `<a:ln><a:noFill/></a:ln>`;
  return `
  <p:sp>
    <p:nvSpPr>
      <p:cNvPr id="${id}" name="${name}"/>
      <p:cNvSpPr txBox="1"/>
      <p:nvPr/>
    </p:nvSpPr>
    <p:spPr>
      <a:xfrm>
        <a:off x="${x}" y="${y}"/>
        <a:ext cx="${w}" cy="${h}"/>
      </a:xfrm>
      <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
      ${fill}${ln}
    </p:spPr>
    <p:txBody>
      <a:bodyPr wrap="square" lIns="100000" tIns="60000" rIns="100000" bIns="60000" anchor="${opts.anchor || "t"}"/>
      <a:lstStyle/>
      ${paras}
    </p:txBody>
  </p:sp>`;
}

function slideXml(shapes) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sld xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="F7F4EF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
      ${shapeText(2, "bar", 0, 0, 12192000, 274320, [""], { fill: "2F5D50" })}
      ${shapes}
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sld>`;
}

function titleSlide(model, lang) {
  const dest = dash(model.meta?.destination);
  return slideXml(`
    ${shapeText(3, "brand", 457200, 457200, 11277600, 400000, ["TravelAO"], { size: 1400, color: "2F5D50", bold: true })}
    ${shapeText(4, "title", 457200, 1400000, 11277600, 1200000, [dest], { size: 3600, bold: true, color: "1A1A1A" })}
    ${shapeText(5, "meta", 457200, 2800000, 11277600, 2200000, [
      `${t("dates", lang)}: ${dash(model.meta?.dates)}`,
      `${t("colCountry", lang)} / ${t("colCity", lang)}: ${dash(model.meta?.country)} · ${dash(model.meta?.city)}`,
      `${t("purpose", lang)}: ${dash(model.meta?.purpose)}`,
      `${t("budget", lang)}: ${dash(model.meta?.budget)}`,
      `${t("colStay", lang)}: ${dash(model.meta?.hotelPick)}`,
    ], { size: 1800 })}
  `);
}

function allDaysOverviewSlides(days, lang) {
  const lines = [];
  for (const day of days) {
    lines.push(`${day.day}  ·  ${dash(day.date)}  ·  ${dash(day.city)}${day.country ? `, ${day.country}` : ""}`);
    lines.push(`${t("colStay", lang)}: ${dash(day.accommodation)}    ${t("colMainDest", lang)}: ${dash(day.mainDestination)}`);
    lines.push(...wrapLines(`${t("colTransport", lang)}: ${dash(day.transportation)}`, 96));
    const morning = slotText(day, "morning");
    const afternoon = slotText(day, "afternoon");
    const evening = slotText(day, "evening");
    if (morning) lines.push(...wrapLines(`${t("dayMorning", lang)}: ${morning}`, 96));
    if (afternoon) lines.push(...wrapLines(`${t("dayAfternoon", lang)}: ${afternoon}`, 96));
    if (evening) lines.push(...wrapLines(`${t("dayEvening", lang)}: ${evening}`, 96));
    lines.push("");
  }
  const chunks = [];
  let buf = [];
  for (const line of lines) {
    if (buf.length >= 18 && line === "") {
      chunks.push(buf);
      buf = [];
      continue;
    }
    buf.push(line);
  }
  if (buf.length) chunks.push(buf);

  return chunks.map((chunk, idx) =>
    slideXml(`
    ${shapeText(3, "eyebrow", 457200, 360000, 11277600, 320000, [`TravelAO · ${t("dayOverview", lang)} · ${t("allDays", lang)}${chunks.length > 1 ? ` (${idx + 1}/${chunks.length})` : ""}`], { size: 1400, color: "2F5D50", bold: true })}
    ${shapeText(4, "title", 457200, 700000, 11277600, 480000, [t("tripOverview", lang)], { size: 2400, bold: true })}
    ${shapeText(5, "body", 457200, 1220000, 11277600, 5200000, chunk, { size: 1300, fill: "FFFFFF", line: "E6DFD4" })}
  `)
  );
}

function dayDetailSlide(day, lang) {
  const slots = day.slots?.length
    ? day.slots
    : [
        { timeLabel: t("dayMorning", lang), time: "", location: "", activity: "" },
        { timeLabel: t("dayAfternoon", lang), time: "", location: "", activity: "" },
        { timeLabel: t("dayEvening", lang), time: "", location: "", activity: "" },
      ];
  const lines = [];
  for (const slot of slots) {
    lines.push(`${slot.timeLabel || ""}  ${slot.time || ""}`.trim());
    if (slot.location) lines.push(`📍 ${slot.location}`);
    lines.push(...wrapLines(slot.activity || "", 92));
    lines.push("");
  }
  return slideXml(`
    ${shapeText(3, "eyebrow", 457200, 400000, 11277600, 360000, [`${day.day} · ${dash(day.city)} · ${dash(day.country)}`], { size: 1400, color: "2F5D50", bold: true })}
    ${shapeText(4, "title", 457200, 800000, 11277600, 520000, [t("dayDetails", lang)], { size: 2400, bold: true })}
    ${shapeText(5, "body", 457200, 1400000, 11277600, 5000000, lines.slice(0, 16), { size: 1500, fill: "FFFFFF", line: "E6DFD4" })}
  `);
}

const PPT_THEME = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="TravelAO">
  <a:themeElements>
    <a:clrScheme name="TravelAO">
      <a:dk1><a:srgbClr val="1A1A1A"/></a:dk1>
      <a:lt1><a:srgbClr val="FFFFFF"/></a:lt1>
      <a:dk2><a:srgbClr val="2F5D50"/></a:dk2>
      <a:lt2><a:srgbClr val="F7F4EF"/></a:lt2>
      <a:accent1><a:srgbClr val="2F5D50"/></a:accent1>
      <a:accent2><a:srgbClr val="C45C26"/></a:accent2>
      <a:accent3><a:srgbClr val="5B8A7A"/></a:accent3>
      <a:accent4><a:srgbClr val="D4A574"/></a:accent4>
      <a:accent5><a:srgbClr val="6B8F71"/></a:accent5>
      <a:accent6><a:srgbClr val="8B6F47"/></a:accent6>
      <a:hlink><a:srgbClr val="2F5D50"/></a:hlink>
      <a:folHlink><a:srgbClr val="1F3F36"/></a:folHlink>
    </a:clrScheme>
    <a:fontScheme name="TravelAO">
      <a:majorFont><a:latin typeface="Calibri"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface="Calibri"/></a:majorFont>
      <a:minorFont><a:latin typeface="Calibri"/><a:ea typeface="Microsoft YaHei"/><a:cs typeface="Calibri"/></a:minorFont>
    </a:fontScheme>
    <a:fmtScheme name="TravelAO">
      <a:fillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:fillStyleLst>
      <a:lnStyleLst>
        <a:ln w="6350" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="12700" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
        <a:ln w="19050" cap="flat" cmpd="sng" algn="ctr"><a:solidFill><a:schemeClr val="phClr"/></a:solidFill><a:prstDash val="solid"/></a:ln>
      </a:lnStyleLst>
      <a:effectStyleLst>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
        <a:effectStyle><a:effectLst/></a:effectStyle>
      </a:effectStyleLst>
      <a:bgFillStyleLst>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
        <a:solidFill><a:schemeClr val="phClr"/></a:solidFill>
      </a:bgFillStyleLst>
    </a:fmtScheme>
  </a:themeElements>
</a:theme>`;

const PPT_MASTER = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldMaster xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:cSld>
    <p:bg><p:bgPr><a:solidFill><a:srgbClr val="F7F4EF"/></a:solidFill><a:effectLst/></p:bgPr></p:bg>
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMap bg1="lt1" tx1="dk1" bg2="lt2" tx2="dk2" accent1="accent1" accent2="accent2" accent3="accent3" accent4="accent4" accent5="accent5" accent6="accent6" hlink="hlink" folHlink="folHlink"/>
  <p:sldLayoutIdLst>
    <p:sldLayoutId id="2147483649" r:id="rId1"/>
  </p:sldLayoutIdLst>
</p:sldMaster>`;

const PPT_LAYOUT = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:sldLayout xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main" type="blank" preserve="1">
  <p:cSld name="Blank">
    <p:spTree>
      <p:nvGrpSpPr><p:cNvPr id="1" name=""/><p:cNvGrpSpPr/><p:nvPr/></p:nvGrpSpPr>
      <p:grpSpPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/><a:chOff x="0" y="0"/><a:chExt cx="0" cy="0"/></a:xfrm></p:grpSpPr>
    </p:spTree>
  </p:cSld>
  <p:clrMapOvr><a:masterClrMapping/></p:clrMapOvr>
</p:sldLayout>`;

function buildPptx(model, lang, dayNum = null) {
  const days = buildDaySummaries(model);
  const selected = dayNum == null ? days : days.filter((d) => Number(d.dayNum) === Number(dayNum));
  const slides = [];
  if (dayNum == null) {
    slides.push(titleSlide(model, lang));
    slides.push(...allDaysOverviewSlides(days, lang));
    for (const day of days) slides.push(dayDetailSlide(day, lang));
  } else {
    slides.push(...allDaysOverviewSlides(selected, lang));
    for (const day of selected) slides.push(dayDetailSlide(day, lang));
  }

  const slideRels = slides
    .map((_, i) => `<Relationship Id="rId${i + 2}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slide" Target="slides/slide${i + 1}.xml"/>`)
    .join("");
  const sldIdLst = slides
    .map((_, i) => `<p:sldId id="${256 + i}" r:id="rId${i + 2}"/>`)
    .join("");
  const contentOverrides = slides
    .map((_, i) => `<Override PartName="/ppt/slides/slide${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slide+xml"/>`)
    .join("");

  const files = [
    {
      name: "[Content_Types].xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/ppt/presentation.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.presentation.main+xml"/>
  <Override PartName="/ppt/slideMasters/slideMaster1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideMaster+xml"/>
  <Override PartName="/ppt/slideLayouts/slideLayout1.xml" ContentType="application/vnd.openxmlformats-officedocument.presentationml.slideLayout+xml"/>
  <Override PartName="/ppt/theme/theme1.xml" ContentType="application/vnd.openxmlformats-officedocument.theme+xml"/>
  ${contentOverrides}
  <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
  <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
</Types>`,
    },
    {
      name: "_rels/.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="ppt/presentation.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
  <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
</Relationships>`,
    },
    {
      name: "ppt/_rels/presentation.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="slideMasters/slideMaster1.xml"/>
  ${slideRels}
</Relationships>`,
    },
    {
      name: "ppt/presentation.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<p:presentation xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" xmlns:p="http://schemas.openxmlformats.org/presentationml/2006/main">
  <p:sldMasterIdLst><p:sldMasterId id="2147483648" r:id="rId1"/></p:sldMasterIdLst>
  <p:sldIdLst>${sldIdLst}</p:sldIdLst>
  <p:sldSz cx="12192000" cy="6858000"/>
  <p:notesSz cx="6858000" cy="9144000"/>
</p:presentation>`,
    },
    { name: "ppt/slideMasters/slideMaster1.xml", data: PPT_MASTER },
    {
      name: "ppt/slideMasters/_rels/slideMaster1.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="../theme/theme1.xml"/>
</Relationships>`,
    },
    { name: "ppt/slideLayouts/slideLayout1.xml", data: PPT_LAYOUT },
    {
      name: "ppt/slideLayouts/_rels/slideLayout1.xml.rels",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideMaster" Target="../slideMasters/slideMaster1.xml"/>
</Relationships>`,
    },
    { name: "ppt/theme/theme1.xml", data: PPT_THEME },
    {
      name: "docProps/core.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <dc:title>${xml(model.meta?.title || "TravelAO")}</dc:title>
  <dc:creator>TravelAO</dc:creator>
</cp:coreProperties>`,
    },
    {
      name: "docProps/app.xml",
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties">
  <Application>TravelAO</Application>
  <Slides>${slides.length}</Slides>
</Properties>`,
    },
  ];

  slides.forEach((xmlDoc, i) => {
    files.push({ name: `ppt/slides/slide${i + 1}.xml`, data: xmlDoc });
    files.push({
      name: `ppt/slides/_rels/slide${i + 1}.xml.rels`,
      data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/slideLayout" Target="../slideLayouts/slideLayout1.xml"/>
</Relationships>`,
    });
  });

  return zipStore(files);
}

export function downloadExcel(model, lang) {
  const name = fileSlug(model.meta?.destination);
  const bytes = buildXlsx(model, lang);
  downloadBytes(`${name}-overview.xlsx`, bytes, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
}

export function downloadPpt(model, lang, dayNum = null) {
  const name = fileSlug(model.meta?.destination);
  const bytes = buildPptx(model, lang, dayNum);
  const suffix = dayNum == null ? "days" : `day-${dayNum}`;
  downloadBytes(`${name}-${suffix}.pptx`, bytes, "application/vnd.openxmlformats-officedocument.presentationml.presentation");
}

export { buildXlsx, buildPptx };
