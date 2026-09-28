// Mobile layout and view-change checks at 390 px, in headless Chrome.
//   node scripts/mobile-check.mjs <url> [screenshot-folder]
// Covers the two release blockers: page width and header at 390 px, and
// scroll reset plus heading focus after every view change.
import { chromium } from "playwright-core";
const BASE = process.argv[2] ?? "http://localhost:3110";
const OUT = process.argv[3]; // optional folder for screenshots
// Uses an installed Chrome. Set CHROME_PATH if it lives somewhere else.
const CHROME = process.env.CHROME_PATH ?? (process.platform === "darwin" ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" : "/usr/bin/google-chrome");
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
const results = [];
const ok = (name, pass, detail = "") => { results.push(pass); console.log(`${pass ? "✓" : "✗"} ${name}${detail ? " · " + detail : ""}`); };

for (const path of ["/", "/scenario/labels", "/scenario/pickup", "/scenario/jordan", "/scenario/labels-b", "/design", "/review", "/author", "/checklist/labels"]) {
  await page.goto(BASE + path, { waitUntil: "networkidle" });
  const w = await page.evaluate(() => document.documentElement.scrollWidth);
  const brandH = await page.evaluate(() => document.querySelector("header a")?.getBoundingClientRect().height ?? 0);
  ok(`${path} fits 390 px`, w <= 390, `scrollWidth ${w}, brand height ${Math.round(brandH)} px`);
}
await page.goto(BASE + "/", { waitUntil: "networkidle" });
if (OUT) await page.screenshot({ path: `${OUT}/home-390.png` });

// Mobile menu
await page.getByRole("button", { name: "Menu" }).click();
const vis = await page.locator("#mobile-nav a").evaluateAll((els) => els.map((e) => e.textContent));
ok("menu opens with scenario titles", vis.length === 5 && vis.includes("The Pickup Counter"), vis.join(" | "));
if (OUT) await page.screenshot({ path: `${OUT}/menu-390.png` });
await page.keyboard.press("Escape");
ok("Escape closes menu", (await page.locator("#mobile-nav").count()) === 0);

// CTA
await page.getByRole("link", { name: "Choose a scenario" }).click();
await page.waitForTimeout(400);
ok("CTA scrolls to scenarios", await page.evaluate(() => { const r = document.getElementById("scenarios").getBoundingClientRect(); return r.top >= -5 && r.top < 200; }));

// Conversation: start from the bottom of the intake page
await page.goto(BASE + "/scenario/labels", { waitUntil: "networkidle" });
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.getByRole("button", { name: "Start the conversation" }).click();
await page.waitForTimeout(300);
let st = await page.evaluate(() => ({ y: window.scrollY, focus: document.activeElement?.tagName + ":" + document.activeElement?.textContent }));
ok("conversation start resets scroll and focuses heading", st.y === 0 && st.focus.startsWith("H1:"), JSON.stringify(st));
if (OUT) await page.screenshot({ path: `${OUT}/labels-play-390.png` });
// End conversation → debrief
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.getByRole("button", { name: "End the conversation" }).click();
await page.getByRole("button", { name: "See your debrief" }).click();
await page.waitForTimeout(300);
st = await page.evaluate(() => ({ y: window.scrollY, focus: document.activeElement?.tagName + ":" + document.activeElement?.textContent }));
ok("conversation debrief resets scroll and focuses heading", st.y === 0 && st.focus.startsWith("H1:"), JSON.stringify(st));
const dw = await page.evaluate(() => document.documentElement.scrollWidth);
ok("conversation debrief fits 390 px", dw <= 390, `scrollWidth ${dw}`);

// Tree: start, play scripted options to an ending, debrief
await page.goto(BASE + "/scenario/jordan", { waitUntil: "networkidle" });
ok("tree intake has no radio for a single role", (await page.locator('input[type="radio"]').count()) === 0);
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.getByRole("button", { name: "Start the scenario" }).click();
await page.waitForTimeout(300);
st = await page.evaluate(() => ({ y: window.scrollY, focus: document.activeElement?.tagName + ":" + document.activeElement?.textContent }));
ok("tree start resets scroll and focuses heading", st.y === 0 && st.focus.startsWith("H1:"), JSON.stringify(st));
for (let i = 0; i < 8; i++) {
  if (await page.getByRole("button", { name: "See your debrief" }).count()) break;
  await page.locator("button.choice").first().click();
  await page.waitForTimeout(150);
}
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.getByRole("button", { name: "See your debrief" }).click();
await page.waitForTimeout(300);
st = await page.evaluate(() => ({ y: window.scrollY, focus: document.activeElement?.tagName + ":" + document.activeElement?.textContent }));
ok("tree debrief resets scroll and focuses heading", st.y === 0 && st.focus.startsWith("H1:"), JSON.stringify(st));
const tw = await page.evaluate(() => document.documentElement.scrollWidth);
ok("tree debrief fits 390 px", tw <= 390, `scrollWidth ${tw}`);
// Restart from the bottom of the debrief
await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
await page.getByRole("button", { name: "Try again from the start" }).click();
await page.waitForTimeout(300);
st = await page.evaluate(() => ({ y: window.scrollY, focus: document.activeElement?.tagName + ":" + document.activeElement?.textContent }));
ok("tree retry resets scroll and focuses heading", st.y === 0 && st.focus.startsWith("H1:"), JSON.stringify(st));

// Desktop header shows full nav
const d = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await d.goto(BASE + "/", { waitUntil: "networkidle" });
ok("desktop shows full nav, no menu button", (await d.getByRole("button", { name: "Menu" }).isVisible()) === false && (await d.getByRole("link", { name: "The Label Conversation" }).first().isVisible()));
if (OUT) await d.screenshot({ path: `${OUT}/home-1280.png` });

await browser.close();
console.log(`${results.filter(Boolean).length}/${results.length} passed`);
if (results.includes(false)) process.exitCode = 1;
