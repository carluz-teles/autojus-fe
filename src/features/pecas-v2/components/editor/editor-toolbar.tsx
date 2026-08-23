"use client";

// Toolbar do editor — fiel ao mockup. Usa execCommand pra formatação inline
// (deprecated mas funcional em todos os browsers modernos). Se um dia o BE
// pedir versionamento estruturado, trocamos pra Tiptap; aqui não precisamos.

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Bold,
  Indent,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  ListTree,
  Outdent,
  Redo2,
  RemoveFormatting,
  Strikethrough,
  Underline,
  Undo2,
} from "lucide-react";

const BLOCK_OPTIONS = [
  { value: "p", label: "Parágrafo" },
  { value: "h1", label: "Título 1" },
  { value: "h2", label: "Título 2" },
  { value: "h3", label: "Título 3" },
  { value: "blockquote", label: "Citação" },
] as const;

export function EditorToolbar() {
  const exec = (cmd: string, value?: string) =>
    document.execCommand(cmd, false, value);

  return (
    <div className="border-border bg-background flex items-center gap-1 border-b px-8 py-2">
      <select
        aria-label="Bloco"
        defaultValue="p"
        onChange={(e) => exec("formatBlock", `<${e.target.value}>`)}
        className="border-border bg-background hover:bg-muted rounded-md border px-2 py-1 text-[12px] font-medium"
      >
        {BLOCK_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>

      <Divider />

      <IconButton title="Negrito" onClick={() => exec("bold")}>
        <Bold className="size-3.5" />
      </IconButton>
      <IconButton title="Itálico" onClick={() => exec("italic")}>
        <Italic className="size-3.5" />
      </IconButton>
      <IconButton title="Sublinhado" onClick={() => exec("underline")}>
        <Underline className="size-3.5" />
      </IconButton>
      <IconButton title="Tachado" onClick={() => exec("strikeThrough")}>
        <Strikethrough className="size-3.5" />
      </IconButton>

      <Divider />

      <IconButton
        title="Alinhar à esquerda"
        onClick={() => exec("justifyLeft")}
      >
        <AlignLeft className="size-3.5" />
      </IconButton>
      <IconButton title="Centralizar" onClick={() => exec("justifyCenter")}>
        <AlignCenter className="size-3.5" />
      </IconButton>
      <IconButton
        title="Alinhar à direita"
        onClick={() => exec("justifyRight")}
      >
        <AlignRight className="size-3.5" />
      </IconButton>
      <IconButton title="Justificar" onClick={() => exec("justifyFull")}>
        <AlignJustify className="size-3.5" />
      </IconButton>

      <Divider />

      <IconButton
        title="Lista com marcadores"
        onClick={() => exec("insertUnorderedList")}
      >
        <List className="size-3.5" />
      </IconButton>
      <IconButton
        title="Lista numerada"
        onClick={() => exec("insertOrderedList")}
      >
        <ListOrdered className="size-3.5" />
      </IconButton>
      <IconButton title="Diminuir recuo" onClick={() => exec("outdent")}>
        <Outdent className="size-3.5" />
      </IconButton>
      <IconButton title="Aumentar recuo" onClick={() => exec("indent")}>
        <Indent className="size-3.5" />
      </IconButton>
      <IconButton title="Lista aninhada" onClick={() => exec("indent")}>
        <ListTree className="size-3.5" />
      </IconButton>

      <Divider />

      <IconButton
        title="Inserir link"
        onClick={() => {
          const url = prompt("URL do link:");
          if (url) exec("createLink", url);
        }}
      >
        <LinkIcon className="size-3.5" />
      </IconButton>
      <IconButton
        title="Limpar formatação"
        onClick={() => exec("removeFormat")}
      >
        <RemoveFormatting className="size-3.5" />
      </IconButton>

      <div className="ml-auto flex items-center gap-1">
        <IconButton title="Desfazer" onClick={() => exec("undo")}>
          <Undo2 className="size-3.5" />
        </IconButton>
        <IconButton title="Refazer" onClick={() => exec("redo")}>
          <Redo2 className="size-3.5" />
        </IconButton>
      </div>
    </div>
  );
}

function Divider() {
  return <span className="bg-border mx-1 h-4 w-px" />;
}

function IconButton({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="hover:bg-muted text-muted-foreground hover:text-foreground grid size-7 place-items-center rounded-md transition-colors"
    >
      {children}
    </button>
  );
}
