export interface BotSession {
  imagePath: string;
  selectedMask: MaskOption | null;
  selectedFormat: OutputFormat | null;
}

export interface MaskOption {
  id: string;
  name: string;
  path: string;
  scale?: number;
}

export interface OutputFormat {
  type: "stories" | "square";
  width: number;
  height: number;
}
