"use client";

import dynamic from "next/dynamic";
import { useColorMode } from "@/ui/index";
import "@uiw/react-md-editor/markdown-editor.css";

const Markdown = dynamic(
  async () => {
    const mod = await import("@uiw/react-md-editor");
    return mod.default.Markdown;
  },
  { ssr: false },
);

export function MarkdownBody({ source }: { source: string }) {
  const { colorMode } = useColorMode();
  return (
    <div data-color-mode={colorMode ?? "light"}>
      <Markdown source={source} />
    </div>
  );
}
