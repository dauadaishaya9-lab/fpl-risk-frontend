// patch-debug-view.js
// Run from fpl-risk-frontend root: node patch-debug-view.js
// Adds a temporary raw JSON debug panel right above the rank movement
// section, so the real API response can be read directly on the page.
// Remove later with: git checkout src/App.jsx

import fs from "fs";

const path = "./src/App.jsx";
let content = fs.readFileSync(path, "utf8");

const marker = "{result?.rankImpact && (";
const debugBlock = `{result && <pre style={{whiteSpace:'pre-wrap',fontSize:11,background:'#111',color:'#0f0',padding:10,margin:10,borderRadius:6,overflowX:'auto'}}>{JSON.stringify(result, null, 2)}</pre>}`;

if (!content.includes(marker)) {
  console.log("SKIPPED: could not find the expected anchor point in src/App.jsx. File may differ from what this script expects.");
} else if (content.includes("whiteSpace:'pre-wrap'")) {
  console.log("SKIPPED: debug panel already present.");
} else {
  content = content.replace(marker, debugBlock + marker);
  fs.writeFileSync(path, content, "utf8");
  console.log("Applied: debug panel inserted above the rank movement section.");
}
