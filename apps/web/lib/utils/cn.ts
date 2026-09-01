import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * tailwind-merge only knows Tailwind's default scales. Our type steps live in
 * tokens.css, so without this it reads `text-small` as a colour, decides it
 * conflicts with `text-paper` and drops one of them — which silently painted
 * ink text on the blue button. Declaring the scale keeps size and colour in
 * separate groups.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [{ text: ["display", "h1", "h2", "h3", "body", "small", "micro"] }],
    },
  },
});

/** Merge conditional class names, letting later Tailwind utilities win. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
