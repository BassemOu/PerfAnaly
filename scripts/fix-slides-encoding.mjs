import { readFileSync, writeFileSync } from "fs";

let c = readFileSync("public/slides.html", "utf8");

// Multiplication × shown as replacement character
c = c.replaceAll("\uFFFD 0.40", "&times; 0.40");
c = c.replaceAll("\uFFFD 0.20", "&times; 0.20");

// ∈ [0, 100] — element-of / range symbol after formula
c = c.replace(/\uFFFD\s*\[0, 100\]/g, "&isin; [0, 100]");

// Range dashes in score badges: 90–100 etc
c = c.replace(/(\d+)\uFFFD(\d+)/g, "$1&ndash;$2");

// Bullet separators between list items in cards
c = c.replaceAll(" \uFFFD ", " &middot; ");

// Section / comment separators: "Slide N of N · Title" and "<!-- SLIDE N · Title -->"
c = c.replace(/(\d) \uFFFD ([A-Z])/g, "$1 &middot; $2");

// Orphaned replacement char at start of lines (comment headers)
c = c.replace(/<!-- SLIDE (\d+) \uFFFD /g, "<!-- SLIDE $1 &middot; ");

// Strip broken emoji prefixes (rendered as "?? ") — keep clean text
c = c.replaceAll("?? Teaching Inputs", "Teaching Inputs");
c = c.replaceAll("?? Research Inputs", "Research Inputs");
c = c.replaceAll("?? Service Inputs", "Service Inputs");
c = c.replaceAll("?? How AI Uses Teaching Data", "How AI Uses Teaching Data");
c = c.replaceAll("?? How AI Uses Research Data", "How AI Uses Research Data");
c = c.replaceAll("?? How AI Uses Service Data", "How AI Uses Service Data");

// Any remaining stray replacement characters — replace with middot
c = c.replaceAll("\uFFFD", "&middot;");

writeFileSync("public/slides.html", c, "utf8");
console.log("Encoding fixed.");
