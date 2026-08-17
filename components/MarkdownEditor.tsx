"use client";

import dynamic from "next/dynamic";
import { useColorMode } from "@/ui/index";
import "@uiw/react-md-editor/markdown-editor.css";

const MDEditor = dynamic(() => import("@uiw/react-md-editor"), { ssr: false });

type Props = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
};

export function MarkdownEditor({ value, onChange, placeholder }: Props) {
  const { colorMode } = useColorMode();
  return (
    <div data-color-mode={colorMode ?? "light"} data-testid="markdown-editor">
      <MDEditor
        value={value}
        onChange={(next) => onChange(next ?? "")}
        preview="edit"
        visibleDragbar={false}
        height={280}
        textareaProps={{ placeholder }}
      />
    </div>
  );
}
