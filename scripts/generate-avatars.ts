import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { ANIMALS, AVATARS } from "../src/lib/avatars";

// Original vector artwork. Every mark is a path or primitive, with no embedded
// raster images, external fonts, scripts, or external resources.
const ink = "#171c21", gold = "#d7b574", cream = "#f4e5c9";
const palettes = [
  ["#c98c45", "#70432e"], ["#87634d", "#49392e"], ["#eee7d9", "#262f33"],
  ["#cd693a", "#703c30"], ["#87999d", "#40565e"], ["#d59849", "#86532d"],
  ["#536873", "#354954"], ["#c1a16a", "#705738"], ["#ba9473", "#6a4d3d"],
  ["#92958a", "#414e4d"], ["#ded2c2", "#9d7b74"], ["#b68051", "#785237"],
  ["#d4c6a9", "#86715a"], ["#917265", "#644c43"], ["#4d515c", "#c18b61"],
];
const backgrounds = ["#a62d38", "#922632", "#b63243", "#9f2939"];
const suits = ["#25313b", "#343d50", "#35404c", "#203e3b"];
const p = (d: string, fill: string, width = 3) => `<path d="${d}" fill="${fill}" stroke="${ink}" stroke-width="${width}" stroke-linejoin="round" stroke-linecap="round"/>`;
const ellipse = (x: number,y: number,rx: number,ry: number,fill: string,stroke = ink,width = 3) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" stroke="${stroke}" stroke-width="${width}"/>`;

export function renderAvatar(index: number) {
  const a = AVATARS[index], species = ANIMALS.indexOf(a.animal), look = index % 4;
  const feminine = look > 1, [fur, dark] = palettes[species];
  const round = ["Bear","Panda","Raccoon"].includes(a.animal);
  const long = ["Deer","Ram","Bull","Doberman"].includes(a.animal);
  const pointed = ["Fox","Wolf","Panther","Lynx","Doberman"].includes(a.animal);
  let ears = round
    ? ellipse(76,77,21,23,dark)+ellipse(180,77,21,23,dark)+ellipse(76,77,11,13,fur,ink,0)+ellipse(180,77,11,13,fur,ink,0)
    : pointed
      ? p("M69 106 L61 39 Q91 47 104 80 M152 80 Q166 46 195 39 L186 109",fur)+p("M74 85 L71 56 L94 81 M163 81 L185 56 L180 88",dark,0)
      : ellipse(74,84,20,16,fur)+ellipse(182,84,20,16,fur);
  if(a.animal === "Rabbit") ears = p("M87 91 Q54 18 82 19 Q103 27 108 83 M148 83 Q154 16 176 19 Q200 24 169 94",fur)+p("M88 74 Q72 36 83 34 L99 77 M157 77 L174 34 Q184 35 167 77", "#bb8e89",0);
  if(a.animal === "Deer") ears += p("M96 77 L80 48 L78 17 M80 48 L60 35 L54 20 M78 32 L92 20 M160 77 L176 48 L178 17 M176 48 L196 35 L202 20 M178 32 L164 20", "none",6);
  if(a.animal === "Bull") ears += p("M79 87 Q40 84 49 39 Q59 64 85 62 M177 87 Q216 84 207 39 Q197 64 171 62",cream);
  if(a.animal === "Ram") ears += p("M93 67 C42 39 35 112 75 116 C99 116 104 83 82 80 Q65 78 67 96 M163 67 C214 39 221 112 181 116 C157 116 152 83 174 80 Q191 78 189 96", "#b69b70",8);
  let mane = "";
  if(a.animal === "Lion") mane = p("M128 49 L159 48 L175 66 L194 76 L190 100 L202 122 L187 143 L181 168 L154 178 L128 193 L102 178 L75 168 L69 143 L54 122 L66 100 L62 76 L81 66 L97 48 Z",dark);
  const head = long ? "M84 83 Q128 59 172 83 L174 127 L155 165 Q128 185 101 165 L82 127 Z"
    : round ? "M70 92 Q81 62 128 65 Q175 62 186 92 L185 132 Q175 172 128 178 Q81 172 71 132 Z"
    : "M77 84 Q128 59 179 84 L183 116 L197 124 L176 138 Q162 169 128 178 Q94 169 80 138 L59 124 L73 116 Z";
  let marks = "";
  if(["Fox","Wolf","Lynx"].includes(a.animal)) marks += p("M78 117 Q99 128 128 148 Q157 128 178 117 L167 151 L128 173 L89 151 Z",cream,0);
  if(a.animal === "Panda") marks += ellipse(99,112,20,24,dark,ink,0)+ellipse(157,112,20,24,dark,ink,0);
  if(a.animal === "Raccoon") marks += p("M73 98 L115 106 L128 118 L141 106 L183 98 L177 129 L145 137 L128 124 L111 137 L79 129 Z",dark,0);
  if(a.animal === "Tiger") marks += p("M114 72 L119 94 L126 75 L132 94 L141 72 M75 96 L98 103 L77 109 M179 96 L158 103 L179 109 M77 123 L99 133 L83 138 M179 123 L157 133 L173 138",dark,0);
  if(a.animal === "Leopard") marks += [[96,83],[119,77],[145,80],[164,89],[77,116],[178,116],[90,143],[166,143]].map(([x,y])=>ellipse(x,y,5,4,dark,ink,1)).join("");
  if(a.animal === "Doberman") marks += p("M86 99 L107 96 L111 105 L89 109 M145 105 L149 96 L170 99 L167 109 M108 131 L128 124 L148 131 L155 159 L128 173 L101 159 Z",dark,0);
  if(a.animal === "Lynx") marks += p("M62 46 L57 29 L72 43 M194 46 L199 29 L184 43",ink,2);
  if(a.animal === "Deer") marks += p("M121 77 L135 77 L140 138 L116 138 Z",cream,0);
  const muzzleColor = ["Panther","Doberman","Bull"].includes(a.animal) ? dark : cream;
  const muzzle = ellipse(115,148,19,14,muzzleColor,ink,0)+ellipse(141,148,19,14,muzzleColor,ink,0)
    +p("M118 138 Q128 133 138 138 L128 146 Z",ink,2)+p("M128 146 L128 154 Q138 160 146 153 M128 154 Q120 159 113 155","none",2);
  let eyes = p("M88 111 L110 115 Q100 129 90 119 Z",cream,2)+p("M168 111 L146 115 Q156 129 166 119 Z",cream,2)
    +ellipse(101,117,3,5,ink,ink,0)+ellipse(155,117,3,5,ink,ink,0)
    +p("M87 102 L111 108 M169 102 L145 108","none",feminine?3:5);
  if(feminine) eyes += p("M89 114 L83 108 M167 114 L173 108","none",3);
  if(look === 1) eyes = p("M81 106 L115 109 L111 127 Q87 134 83 118 Z M141 109 L175 106 L173 118 Q169 134 145 127 Z",ink)+p("M116 113 Q128 108 140 113 M89 111 L103 114 M148 114 L162 111","none",2).replaceAll(`stroke="${ink}"`,`stroke="${gold}"`);
  let accessories = "";
  if(look === 0 && !["Deer","Rabbit","Ram"].includes(a.animal)) accessories += p("M83 76 L91 39 Q108 31 127 43 Q149 33 167 39 L175 75 Z", "#252b30")+p("M86 62 L171 62 L175 75 L83 75 Z",gold,0)+p("M64 79 Q124 70 192 76 L196 84 Q128 95 60 87 Z", "#252b30");
  if(look === 2) accessories += p("M80 85 Q113 47 165 76 L174 87 Q133 65 80 85 Z",ink,2)+ellipse(167,80,9,9,gold)+p("M168 73 Q179 29 193 29 Q200 56 174 79",dark,2)+p("M176 69 L190 37","none",2);
  if(feminine) accessories += ellipse(78,143,5,10,gold)+ellipse(178,143,5,10,gold)+p("M119 159 Q128 155 137 159 Q127 166 119 159",look===2?"#a34853":"#965147",0);
  if(look===3) accessories += p("M84 84 Q128 55 172 84","none",4).replace(`stroke="${ink}"`,`stroke="${gold}"`)+ellipse(128,69,5,6,gold,ink,1);
  const outfit = p("M33 256 L41 218 Q53 193 100 181 L156 181 Q203 193 215 218 L223 256 Z",suits[look])
    +p("M101 181 L128 200 L155 181 L149 256 L107 256 Z",feminine?ink:cream,0)
    +p("M97 183 L79 196 L94 218 L81 222 L114 256 L120 216 Z",look===1?"#655566":"#465359")
    +p("M159 183 L177 196 L162 218 L175 222 L142 256 L136 216 Z",look===1?"#655566":"#465359")
    +(feminine ? p("M110 194 Q128 222 146 194","none",3).replace(`stroke="${ink}"`,`stroke="${gold}"`)+ellipse(128,209,4,6,gold,ink,1)
      : p("M118 201 L138 201 L133 213 L140 245 L128 256 L116 245 L123 213 Z",look===0?"#8e3d43":gold,1))
    +p("M180 214 L195 206 L198 217 Z",cream,0)+ellipse(94,215,3,3,gold,ink,0);
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" role="img" aria-label="${a.name}"><title>${a.name}</title><defs><clipPath id="portrait"><circle cx="128" cy="128" r="124"/></clipPath></defs><circle cx="128" cy="128" r="128" fill="${ink}"/><g clip-path="url(#portrait)"><path fill="${backgrounds[look]}" d="M0 0h256v256H0z"/><circle cx="128" cy="113" r="99" fill="none" stroke="${gold}" stroke-opacity=".22"/><path d="M24 231L231 24M10 198L198 10M58 256L256 58" stroke="${gold}" stroke-opacity=".07" stroke-width="16"/>${outfit}${mane}${ears}${p(head,fur)}${marks}${muzzle}${eyes}${accessories}</g><circle cx="128" cy="128" r="124" fill="none" stroke="${gold}" stroke-width="2"/></svg>`;
}

const output = join(process.cwd(), "public/images/avatars");
mkdirSync(output, { recursive: true });
AVATARS.forEach((avatar, index) => writeFileSync(join(output, `${avatar.id}.svg`), renderAvatar(index)));
console.log(`Generated ${AVATARS.length} original SVG avatars.`);
