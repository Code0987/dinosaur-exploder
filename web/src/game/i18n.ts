import { asset } from "./assets";

export const LANGUAGES = [
  { id: "English", file: "english", native: "English" },
  { id: "French", file: "french", native: "Français" },
  { id: "German", file: "german", native: "Deutsch" },
  { id: "Spanish", file: "spanish", native: "Español" },
  { id: "Italian", file: "italian", native: "Italiano" },
  { id: "Portuguese", file: "portuguese", native: "Português" },
  { id: "Russian", file: "russian", native: "Русский" },
  { id: "Bulgarian", file: "bulgarian", native: "Български" },
  { id: "Chinese", file: "chinese", native: "中文" },
  { id: "Japanese", file: "japanese", native: "日本語" },
  { id: "Greek", file: "greek", native: "Ελληνικά" },
] as const;

export async function loadDictionary(language: string): Promise<Record<string, string>> {
  const match = LANGUAGES.find((item) => item.id.toLowerCase() === language.toLowerCase()) ?? LANGUAGES[0];
  const response = await fetch(asset(`assets/translation/${match.file}.json`));
  if (!response.ok) throw new Error(`Missing translation ${match.file}`);
  return (await response.json()) as Record<string, string>;
}

export function t(dict: Record<string, string>, key: string): string {
  return dict[key] ?? key;
}
