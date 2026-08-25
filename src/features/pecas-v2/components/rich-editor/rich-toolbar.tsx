"use client";

// Toolbar Word-like pro RichEditor. Recebe a instância do Tiptap Editor e
// aciona commands. Cada botão consulta editor.isActive(...) pra highlight.
//
// Grupos (na ordem):
//   1. Estilo de bloco: Parágrafo, Título, Citação
//   2. Fonte: family + size
//   3. Marcas: bold / italic / underline / strike
//   4. Cor de texto (color picker inline)
//   5. Alinhamento: left / center / right / justify
//   6. Listas: bullet / ordered
//   7. Recuo: aumentar / diminuir (via lift/sink lista, ou marker text-indent)
//   8. Blocos: linha, tabela, undo/redo
//
// Sem depender de shadcn Select composto pra evitar re-render pesado — usa
// <select> nativo dentro de wrappers estilizados só pra fonte/tamanho.

import type { Editor } from "@tiptap/react";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
} from "lucide-react";

import { Button } from "@/components/ui/button";

/** Divider vertical inline — shadcn deste repo não tem Separator ainda. */
function Separator({
  orientation = "vertical",
  className = "",
}: {
  orientation?: "vertical" | "horizontal";
  className?: string;
}) {
  const base = orientation === "vertical" ? "w-px h-full" : "h-px w-full";
  return <div className={`bg-border ${base} ${className}`} aria-hidden />;
}

interface Props {
  editor: Editor | null;
}

const FONT_FAMILIES = [
  {
    label: "Times",
    value: "'Liberation Serif', 'Times New Roman', Times, serif",
  },
  { label: "Arial", value: "Arial, Helvetica, sans-serif" },
  { label: "Courier", value: "'Courier New', Courier, monospace" },
];

const FONT_SIZES = ["10pt", "11pt", "12pt", "13pt", "14pt", "16pt", "18pt"];

const TEXT_COLORS = [
  { label: "Preto", value: "#0f172a" },
  { label: "Cinza", value: "#475569" },
  { label: "Vermelho", value: "#b91c1c" },
  { label: "Azul", value: "#1d4ed8" },
];

export function RichToolbar({ editor }: Props) {
  if (!editor) {
    return (
      <div className="border-border/60 bg-muted/30 h-10 rounded-lg border" />
    );
  }
  return (
    <div className="border-border/60 bg-background sticky top-0 z-10 flex flex-wrap items-center gap-1 rounded-lg border px-2 py-1.5 shadow-sm">
      {/* Grupo 1 — Estilo de bloco */}
      <select
        aria-label="Estilo de bloco"
        className="hover:bg-muted h-8 rounded-md border-0 bg-transparent px-2 text-[13px] focus-visible:ring-1 focus-visible:outline-none"
        value={
          editor.isActive("heading", { level: 1 })
            ? "h1"
            : editor.isActive("heading", { level: 2 })
              ? "h2"
              : editor.isActive("heading", { level: 3 })
                ? "h3"
                : editor.isActive("blockquote")
                  ? "quote"
                  : "p"
        }
        onChange={(e) => {
          const v = e.target.value;
          const chain = editor.chain().focus();
          if (v === "p") chain.setParagraph().run();
          else if (v === "quote") chain.toggleBlockquote().run();
          else if (v === "h1") chain.toggleHeading({ level: 1 }).run();
          else if (v === "h2") chain.toggleHeading({ level: 2 }).run();
          else if (v === "h3") chain.toggleHeading({ level: 3 }).run();
        }}
      >
        <option value="p">Parágrafo</option>
        <option value="h1">Título 1</option>
        <option value="h2">Título 2 (Seção)</option>
        <option value="h3">Título 3</option>
        <option value="quote">Citação</option>
      </select>

      <Separator orientation="vertical" className="h-6" />

      {/* Grupo 2 — Fonte + tamanho */}
      <select
        aria-label="Fonte"
        className="hover:bg-muted h-8 rounded-md border-0 bg-transparent px-2 text-[13px] focus-visible:ring-1 focus-visible:outline-none"
        value={
          FONT_FAMILIES.find((f) =>
            editor.isActive("textStyle", { fontFamily: f.value }),
          )?.value ?? FONT_FAMILIES[0].value
        }
        onChange={(e) =>
          editor.chain().focus().setFontFamily(e.target.value).run()
        }
      >
        {FONT_FAMILIES.map((f) => (
          <option key={f.value} value={f.value}>
            {f.label}
          </option>
        ))}
      </select>

      <select
        aria-label="Tamanho"
        className="hover:bg-muted h-8 w-16 rounded-md border-0 bg-transparent px-2 text-[13px] focus-visible:ring-1 focus-visible:outline-none"
        value={
          FONT_SIZES.find((sz) =>
            editor.isActive("textStyle", { fontSize: sz }),
          ) ?? "12pt"
        }
        onChange={(e) =>
          editor.chain().focus().setFontSize(e.target.value).run()
        }
      >
        {FONT_SIZES.map((sz) => (
          <option key={sz} value={sz}>
            {sz}
          </option>
        ))}
      </select>

      <Separator orientation="vertical" className="h-6" />

      {/* Grupo 3 — Marcas inline */}
      <ToolBtn
        label="Negrito"
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="size-4" />
      </ToolBtn>
      <ToolBtn
        label="Itálico"
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="size-4" />
      </ToolBtn>
      <ToolBtn
        label="Sublinhado"
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
      >
        <UnderlineIcon className="size-4" />
      </ToolBtn>
      <ToolBtn
        label="Tachado"
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
      >
        <Strikethrough className="size-4" />
      </ToolBtn>

      <Separator orientation="vertical" className="h-6" />

      {/* Grupo 4 — Cor de texto */}
      <div className="flex items-center gap-0.5">
        {TEXT_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            aria-label={`Cor ${c.label}`}
            title={c.label}
            onClick={() => editor.chain().focus().setColor(c.value).run()}
            className="hover:ring-foreground/40 size-5 rounded-full ring-1 ring-black/10 hover:ring-2"
            style={{ backgroundColor: c.value }}
          />
        ))}
      </div>

      <Separator orientation="vertical" className="h-6" />

      {/* Grupo 5 — Alinhamento */}
      <ToolBtn
        label="Esquerda"
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
      >
        <AlignLeft className="size-4" />
      </ToolBtn>
      <ToolBtn
        label="Centro"
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
      >
        <AlignCenter className="size-4" />
      </ToolBtn>
      <ToolBtn
        label="Direita"
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
      >
        <AlignRight className="size-4" />
      </ToolBtn>
      <ToolBtn
        label="Justificar"
        active={editor.isActive({ textAlign: "justify" })}
        onClick={() => editor.chain().focus().setTextAlign("justify").run()}
      >
        <AlignJustify className="size-4" />
      </ToolBtn>

      <Separator orientation="vertical" className="h-6" />

      {/* Grupo 6 — Listas */}
      <ToolBtn
        label="Lista com marcadores"
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="size-4" />
      </ToolBtn>
      <ToolBtn
        label="Lista numerada"
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered className="size-4" />
      </ToolBtn>
      <ToolBtn
        label="Citação"
        active={editor.isActive("blockquote")}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
      >
        <Quote className="size-4" />
      </ToolBtn>

      <Separator orientation="vertical" className="h-6" />

      {/* Grupo 7 — Blocos: linha horizontal + tabela + undo/redo */}
      <ToolBtn
        label="Linha horizontal"
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
      >
        <Minus className="size-4" />
      </ToolBtn>
      <ToolBtn
        label="Inserir tabela"
        onClick={() =>
          editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run()
        }
      >
        <TableIcon className="size-4" />
      </ToolBtn>

      <Separator orientation="vertical" className="h-6" />

      <ToolBtn
        label="Desfazer"
        onClick={() => editor.chain().focus().undo().run()}
      >
        <Undo2 className="size-4" />
      </ToolBtn>
      <ToolBtn
        label="Refazer"
        onClick={() => editor.chain().focus().redo().run()}
      >
        <Redo2 className="size-4" />
      </ToolBtn>
    </div>
  );
}

function ToolBtn({
  label,
  active,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      aria-label={label}
      title={label}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={
        active
          ? "bg-muted text-foreground size-8 p-0"
          : "text-muted-foreground size-8 p-0"
      }
    >
      {children}
    </Button>
  );
}
