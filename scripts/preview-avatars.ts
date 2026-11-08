import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import sharp from "sharp";
import { AVATARS } from "../src/lib/avatars";

async function main() {
  const cards = AVATARS.map((avatar, i) => {
    const x = (i % 8) * 152 + 24, y = Math.floor(i / 8) * 170 + 100;
    const svg = readFileSync(`public${avatar.url}`, "utf8").replace("<svg ", `<svg x="${x}" y="${y}" width="128" height="128" `);
    return `${svg}<text x="${x + 64}" y="${y + 146}" text-anchor="middle" font-family="Arial" font-size="11" fill="#e2d5bd">${avatar.id.replaceAll("-", " / ")}</text>`;
  });
  const sheet = `<svg xmlns="http://www.w3.org/2000/svg" width="1240" height="1480"><path fill="#201c20" d="M0 0h1240v1480H0z"/><text x="28" y="38" font-family="Georgia" font-size="30" fill="#e2c38c">THE RELIX FAMILY</text><text x="28" y="65" font-family="Arial" font-size="13" fill="#c6c4b8">60 ORIGINAL VECTOR CHARACTERS · ONE CHARACTER, ONE MEMBER</text>${cards.join("")}</svg>`;
  mkdirSync("artifacts", { recursive: true });
  writeFileSync("artifacts/animal-avatar-collection.svg", sheet);
  await sharp(Buffer.from(sheet)).png().toFile("artifacts/animal-avatar-collection.png");
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
