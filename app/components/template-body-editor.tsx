import { EditorContent, useEditor } from "@tiptap/react";
import type { Editor } from "@tiptap/core";
import Link from "@tiptap/extension-link";
import StarterKit from "@tiptap/starter-kit";
import { useEffect, useState } from "react";

type Props = {
  initialHtml: string;
  disabled?: boolean;
  inputName?: string;
};

function MenuBar({
  editor,
  disabled,
}: {
  editor: Editor | null;
  disabled: boolean;
}) {
  if (!editor) {
    return (
      <div className="min-h-[2.25rem] border-b border-zinc-800 bg-zinc-900/50" />
    );
  }

  const item = (
    label: string,
    onPress: () => void,
    isActive = false,
    canRun = true,
  ) => (
    <button
      type="button"
      disabled={disabled || !canRun}
      onClick={() => onPress()}
      className={`rounded px-2 py-1 text-xs font-medium ${
        isActive
          ? "bg-zinc-700 text-white"
          : "text-zinc-400 hover:bg-zinc-800 hover:text-white"
      } disabled:cursor-not-allowed disabled:opacity-40`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex flex-wrap gap-1 border-b border-zinc-800 bg-zinc-900/80 px-2 py-1.5">
      {item("Bold", () => editor.chain().focus().toggleBold().run(), editor.isActive("bold"))}
      {item("Italic", () => editor.chain().focus().toggleItalic().run(), editor.isActive("italic"))}
      {item("Strike", () => editor.chain().focus().toggleStrike().run(), editor.isActive("strike"))}
      {item("Code", () => editor.chain().focus().toggleCode().run(), editor.isActive("code"))}
      {item(
        "Bullet list",
        () => editor.chain().focus().toggleBulletList().run(),
        editor.isActive("bulletList"),
      )}
      {item(
        "Numbered",
        () => editor.chain().focus().toggleOrderedList().run(),
        editor.isActive("orderedList"),
      )}
      {item(
        "Quote",
        () => editor.chain().focus().toggleBlockquote().run(),
        editor.isActive("blockquote"),
      )}
      {item(
        "Link",
        () => {
          const previous = editor.getAttributes("link").href as string | undefined;
          const next = window.prompt(
            "Link URL (leave empty to remove)",
            previous ?? "https://",
          );
          if (next === null) return;
          const trimmed = next.trim();
          if (trimmed === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: trimmed }).run();
        },
        editor.isActive("link"),
      )}
      {item(
        "Undo",
        () => editor.chain().focus().undo().run(),
        false,
        editor.can().undo(),
      )}
      {item(
        "Redo",
        () => editor.chain().focus().redo().run(),
        false,
        editor.can().redo(),
      )}
    </div>
  );
}

export function TemplateBodyEditor({
  initialHtml,
  disabled = false,
  inputName = "body",
}: Props) {
  const [html, setHtml] = useState(initialHtml);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        autolink: true,
        linkOnPaste: true,
        HTMLAttributes: {
          class:
            "text-emerald-400 underline underline-offset-2 hover:text-emerald-300",
        },
      }),
    ],
    content: initialHtml,
    immediatelyRender: false,
    editable: !disabled,
    editorProps: {
      attributes: {
        class:
          "min-h-[12rem] px-3 py-2 text-sm text-zinc-100 focus:outline-none [&_a]:text-emerald-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:hover:text-emerald-300 [&_p]:my-1 [&_p:first-child]:mt-0 [&_ul]:my-2 [&_ol]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_blockquote]:my-2 [&_blockquote]:border-l-2 [&_blockquote]:border-zinc-600 [&_blockquote]:pl-3 [&_blockquote]:text-zinc-400 [&_h1]:text-xl [&_h1]:font-semibold [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:text-base [&_h3]:font-semibold [&_code]:rounded [&_code]:bg-zinc-800 [&_code]:px-1 [&_pre]:my-2 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-zinc-950 [&_pre]:p-3 [&_hr]:my-4 [&_hr]:border-zinc-700",
      },
    },
    onUpdate: ({ editor: ed }) => {
      setHtml(ed.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) return;
    editor.setEditable(!disabled);
  }, [editor, disabled]);

  return (
    <div className="space-y-0">
      <input type="hidden" name={inputName} value={html} />
      <div className="overflow-hidden rounded-md border border-zinc-700 bg-zinc-950">
        <MenuBar editor={editor} disabled={disabled} />
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}
