"use client";

interface MarkdownToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  onUpdate: (value: string) => void;
}

export default function MarkdownToolbar({ textareaRef, onUpdate }: MarkdownToolbarProps) {
  const wrap = (before: string, after: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const text = ta.value;
    const selected = text.slice(start, end);
    const newText = text.slice(0, start) + before + selected + after + text.slice(end);
    onUpdate(newText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + before.length, end + before.length);
    });
  };

  const insertLine = (prefix: string) => {
    const ta = textareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const text = ta.value;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const newText = text.slice(0, lineStart) + prefix + text.slice(lineStart);
    onUpdate(newText);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(start + prefix.length, start + prefix.length);
    });
  };

  const buttons = [
    { label: "B", action: () => wrap("**", "**"), title: "Bold" },
    { label: "I", action: () => wrap("*", "*"), title: "Italic" },
    { label: "~", action: () => wrap("~~", "~~"), title: "Strikethrough" },
    { label: "<>", action: () => wrap("`", "`"), title: "Inline code" },
    { label: "H1", action: () => insertLine("# "), title: "Heading 1" },
    { label: "H2", action: () => insertLine("## "), title: "Heading 2" },
    { label: ">", action: () => insertLine("> "), title: "Quote" },
    { label: "-", action: () => insertLine("- "), title: "List" },
    { label: "[]", action: () => wrap("[", "](url)"), title: "Link" },
    { label: "```", action: () => wrap("```\n", "\n```"), title: "Code block" },
  ];

  return (
    <div className="flex flex-wrap gap-1 mb-1">
      {buttons.map((btn) => (
        <button
          key={btn.label}
          type="button"
          onClick={btn.action}
          title={btn.title}
          className="px-2 py-1 text-xs font-mono border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors text-neutral-600 dark:text-neutral-400"
        >
          {btn.label}
        </button>
      ))}
    </div>
  );
}
