"use client";

import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Eraser,
  Indent,
  Link2,
  List,
  ListOrdered,
  Outdent,
  Quote,
  Redo2,
  Undo2,
} from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const BLOCOS = [
  { valor: "p", label: "Parágrafo" },
  { valor: "h2", label: "Título de seção" },
  { valor: "h3", label: "Subtítulo" },
  { valor: "blockquote", label: "Citação" },
];

// Mapa value→label para o <SelectValue/> renderizar o rótulo (não a tag).
const BLOCOS_ITEMS = Object.fromEntries(BLOCOS.map((b) => [b.valor, b.label]));

/**
 * Barra WYSIWYG. document.execCommand é depreciado mas segue sendo o caminho
 * mais curto para um contentEditable simples — trocar por Tiptap/Lexical quando
 * a peça precisar de versionamento estruturado.
 */
export function EditorToolbar() {
  const cmd = (nome: string, valor?: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    document.execCommand(nome, false, valor);
  };

  return (
    <div className="border-border bg-background/90 sticky top-0 z-5 flex flex-wrap items-center gap-1 border-b px-5 py-2.5 backdrop-blur-sm">
      <Select
        items={BLOCOS_ITEMS}
        defaultValue="p"
        onValueChange={(v) =>
          document.execCommand("formatBlock", false, v ?? undefined)
        }
      >
        <SelectTrigger className="mr-1 h-8 w-40" aria-label="Tipo de bloco">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {BLOCOS.map((b) => (
            <SelectItem key={b.valor} value={b.valor}>
              {b.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Sep />
      <Btn onMouseDown={cmd("bold")} titulo="Negrito" className="font-bold">
        B
      </Btn>
      <Btn
        onMouseDown={cmd("italic")}
        titulo="Itálico"
        className="font-display italic"
      >
        I
      </Btn>
      <Btn
        onMouseDown={cmd("underline")}
        titulo="Sublinhado"
        className="underline"
      >
        U
      </Btn>
      <Btn
        onMouseDown={cmd("strikeThrough")}
        titulo="Tachado"
        className="line-through"
      >
        S
      </Btn>
      <Sep />
      <Btn onMouseDown={cmd("justifyLeft")} titulo="Alinhar à esquerda">
        <AlignLeft className="size-3.5" />
      </Btn>
      <Btn onMouseDown={cmd("justifyCenter")} titulo="Centralizar">
        <AlignCenter className="size-3.5" />
      </Btn>
      <Btn onMouseDown={cmd("justifyRight")} titulo="Alinhar à direita">
        <AlignRight className="size-3.5" />
      </Btn>
      <Btn onMouseDown={cmd("justifyFull")} titulo="Justificar">
        <AlignJustify className="size-3.5" />
      </Btn>
      <Sep />
      <Btn
        onMouseDown={cmd("insertUnorderedList")}
        titulo="Lista com marcadores"
      >
        <List className="size-3.5" />
      </Btn>
      <Btn onMouseDown={cmd("insertOrderedList")} titulo="Lista numerada">
        <ListOrdered className="size-3.5" />
      </Btn>
      <Btn onMouseDown={cmd("outdent")} titulo="Diminuir recuo">
        <Outdent className="size-3.5" />
      </Btn>
      <Btn onMouseDown={cmd("indent")} titulo="Aumentar recuo">
        <Indent className="size-3.5" />
      </Btn>
      <Sep />
      <Btn onMouseDown={cmd("formatBlock", "blockquote")} titulo="Citação">
        <Quote className="size-3.5" />
      </Btn>
      <Btn
        onMouseDown={cmd("createLink", "https://esaj.tjsp.jus.br")}
        titulo="Inserir link"
      >
        <Link2 className="size-3.5" />
      </Btn>
      <Btn onMouseDown={cmd("removeFormat")} titulo="Limpar formatação">
        <Eraser className="size-3.5" />
      </Btn>
      <span className="ml-auto flex gap-1">
        <Btn onMouseDown={cmd("undo")} titulo="Desfazer">
          <Undo2 className="size-3.5" />
        </Btn>
        <Btn onMouseDown={cmd("redo")} titulo="Refazer">
          <Redo2 className="size-3.5" />
        </Btn>
      </span>
    </div>
  );
}

function Btn({
  children,
  titulo,
  className,
  onMouseDown,
}: {
  children: React.ReactNode;
  titulo: string;
  className?: string;
  onMouseDown: (e: React.MouseEvent) => void;
}) {
  return (
    <button
      type="button"
      title={titulo}
      onMouseDown={onMouseDown}
      className={`text-muted-foreground hover:bg-muted hover:text-foreground grid h-7 w-7.5 cursor-pointer place-items-center rounded-lg text-[13px] ${className ?? ""}`}
    >
      {children}
    </button>
  );
}

function Sep() {
  return <span className="bg-border mx-0.5 h-4.5 w-px" />;
}
