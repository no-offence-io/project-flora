"use client";

import { createContext, useContext, useState, type ReactNode } from "react";

/*
 * The colour chosen on a product page, shared by the two halves that care: the options, where it is
 * picked, and the gallery, which then shows that colour's photos. Outside a provider (the vintage
 * layout, say) there is simply no shared choice, and the gallery shows every photo.
 */
type Choice = { colour: string | null; setColour: (id: string | null) => void };
const ColourChoice = createContext<Choice | null>(null);

export function ProductColourProvider({ children }: { children: ReactNode }) {
  const [colour, setColour] = useState<string | null>(null);
  return <ColourChoice.Provider value={{ colour, setColour }}>{children}</ColourChoice.Provider>;
}

export const useColourChoice = () => useContext(ColourChoice);
