import type { LayoutElementType } from "./layoutTypes";

export type ToolId = LayoutElementType | "road" | "boundary";

export interface ToolDefinition {
  id: ToolId;
  label: string;
  description: string;
  shortcut?: string;
  defaultSize: { width: number; height: number };
}

export const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    id: "boundary",
    label: "Obrys hali",
    description: "Rysowanie granic budynku jako poligonu.",
    shortcut: "B",
    defaultSize: { width: 0, height: 0 },
  },
  {
    id: "department",
    label: "Gniazdo / dział",
    description: "Większy obszar funkcjonalny (gniazdo produkcyjne).",
    shortcut: "G",
    defaultSize: { width: 6, height: 4 },
  },
  {
    id: "workstation",
    label: "Stanowisko",
    description: "Pojedyncze stanowisko robocze.",
    shortcut: "S",
    defaultSize: { width: 2, height: 1 },
  },
  {
    id: "storage",
    label: "Magazyn / bufor",
    description: "Strefa składowania lub bufor międzyoperacyjny.",
    shortcut: "M",
    defaultSize: { width: 4, height: 3 },
  },
  {
    id: "transport",
    label: "Strefa transportowa",
    description: "Obszar korytarza transportowego jako prostokąt.",
    shortcut: "T",
    defaultSize: { width: 6, height: 1 },
  },
  {
    id: "area",
    label: "Strefa serwisu / pomocnicza",
    description: "Strefa pomocnicza, np. serwis, kontrola, UR.",
    defaultSize: { width: 3, height: 2 },
  },
  {
    id: "machine",
    label: "Maszyna (ikona)",
    description: "Dodaj maszynę z listy i umieść ją na planie.",
    shortcut: "I",
    defaultSize: { width: 2, height: 2 },
  },
  {
    id: "road",
    label: "Droga transportowa",
    description: "Rysowanie dróg jako linii na siatce.",
    shortcut: "D",
    defaultSize: { width: 0, height: 0 },
  },
];
