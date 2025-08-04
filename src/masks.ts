import path from "path";
import type { MaskOption } from "./types";

export const masks: MaskOption[] = [
  {
    id: "square",
    name: "1",
    path: path.join(__dirname, "../assets/masks/ramka_1.png"),
    scale: 1,
  },
  {
    id: "stories",
    name: "2",
    path: path.join(__dirname, "../assets/masks/ramka_2.png"),
    scale: 1,
  },
];
