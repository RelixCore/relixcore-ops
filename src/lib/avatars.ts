export const ANIMALS = ["Lion", "Bear", "Panda", "Fox", "Wolf", "Tiger", "Panther", "Leopard", "Lynx", "Raccoon", "Rabbit", "Deer", "Ram", "Bull", "Doberman"] as const;
export const PERSONAS = [
  { id: "don", label: "The Don", style: "Masculine" },
  { id: "consigliere", label: "The Consigliere", style: "Masculine" },
  { id: "donna", label: "La Donna", style: "Feminine" },
  { id: "duchess", label: "The Duchess", style: "Feminine" },
] as const;

export const AVATARS = ANIMALS.flatMap((animal) => PERSONAS.map((persona) => ({
  id: `${animal.toLowerCase()}-${persona.id}`,
  animal,
  style: persona.style,
  name: `${animal} · ${persona.label}`,
  url: `/images/avatars/${animal.toLowerCase()}-${persona.id}.svg`,
})));

export function isCollectionAvatar(url: string) {
  return AVATARS.some((avatar) => avatar.url === url);
}
