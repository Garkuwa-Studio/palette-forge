/**
 * A small syntax highlighter.
 *
 * The docs are static, so this runs at build time and ships no client
 * JavaScript. That rules out Shiki and Prism, which would either add a
 * megabyte of grammars or push highlighting into the browser for text that
 * never changes.
 *
 * Everything is tokenised in a single pass over one alternating regex. That
 * ordering is the whole correctness argument: a `//` inside a string literal
 * must not start a comment, and a keyword inside a comment must not light up.
 * Matching left to right with comments and strings first makes both impossible,
 * where a sequence of independent replace() calls would get them wrong.
 */

export type Language = "ts" | "bash" | "json" | "css";

type TokenKind =
  | "comment"
  | "string"
  | "number"
  | "keyword"
  | "builtin"
  | "fn"
  | "prop"
  | "punct"
  | "flag"
  | "command"
  | "property"
  | "value";

/** Escaped so no source text can ever reach the DOM as markup. */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

const CLASS: Record<TokenKind, string> = {
  comment: "text-syn-comment italic",
  string: "text-syn-string",
  number: "text-syn-number",
  keyword: "text-syn-keyword",
  builtin: "text-syn-builtin",
  fn: "text-syn-fn",
  prop: "text-syn-prop",
  punct: "text-syn-punct",
  flag: "text-syn-keyword",
  command: "text-syn-fn",
  property: "text-syn-fn",
  value: "text-syn-string",
};

const KEYWORDS =
  "import|export|from|default|const|let|var|function|return|await|async|new|class|extends|implements|interface|type|enum|if|else|for|of|in|while|do|switch|case|break|continue|try|catch|finally|throw|typeof|instanceof|as|satisfies|void|delete|yield|static|public|private|readonly";

const BUILTINS =
  "true|false|null|undefined|this|super|console|window|document|self|Math|JSON|Object|Array|String|Number|Boolean|Promise|Map|Set|Uint8Array|Uint8ClampedArray|Float64Array|Error|globalThis";

/**
 * One regex per language, with named groups. Group order is priority order:
 * comments and strings are declared first so nothing inside them is re-scanned.
 */
const GRAMMAR: Record<Language, RegExp> = {
  ts: new RegExp(
    [
      String.raw`(?<comment>\/\/[^\n]*|\/\*[\s\S]*?\*\/)`,
      String.raw`(?<string>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|\`(?:[^\`\\]|\\.)*\`)`,
      String.raw`\b(?<keyword>${KEYWORDS})\b`,
      String.raw`\b(?<builtin>${BUILTINS})\b`,
      String.raw`(?<number>\b0x[0-9a-fA-F]+\b|\b\d[\d_]*(?:\.\d+)?\b)`,
      String.raw`(?<fn>[A-Za-z_$][\w$]*)(?=\s*\()`,
      String.raw`(?<=\.)(?<prop>[A-Za-z_$][\w$]*)`,
      String.raw`(?<punct>[{}()[\]<>;,.:?=!+\-*/%&|]+)`,
    ].join("|"),
    "g",
  ),

  bash: new RegExp(
    [
      String.raw`(?<comment>#[^\n]*)`,
      String.raw`(?<string>"(?:[^"\\\n]|\\.)*"|'(?:[^'\n]|\\.)*')`,
      // Long and short flags read as the operators of a command line.
      String.raw`(?<flag>(?<=\s)--?[A-Za-z][\w-]*)`,
      // The first word of a line, or of a pipeline segment, is the command.
      String.raw`(?<command>(?<=^|\||&&|;)\s*[A-Za-z_][\w.-]*)`,
      String.raw`(?<number>\b\d[\d_.]*\b)`,
      String.raw`(?<punct>[|&><;$(){}]+)`,
    ].join("|"),
    "gm",
  ),

  json: new RegExp(
    [
      // A quoted string immediately before a colon is a key, not a value.
      String.raw`(?<property>"(?:[^"\\]|\\.)*")(?=\s*:)`,
      String.raw`(?<string>"(?:[^"\\]|\\.)*")`,
      String.raw`\b(?<builtin>true|false|null)\b`,
      String.raw`(?<number>-?\b\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b)`,
      String.raw`(?<punct>[{}[\],:]+)`,
    ].join("|"),
    "g",
  ),

  css: new RegExp(
    [
      String.raw`(?<comment>\/\*[\s\S]*?\*\/)`,
      String.raw`(?<string>"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')`,
      String.raw`(?<keyword>@[a-z-]+)`,
      // Custom properties are the point of most CSS shown in these docs.
      String.raw`(?<property>--[\w-]+)`,
      String.raw`(?<value>#[0-9a-fA-F]{3,8}\b|\b(?:oklch|rgb|hsl|var|color-mix)\([^)]*\))`,
      String.raw`(?<number>\b\d[\d_.]*(?:px|rem|em|%|s|ms|deg)?\b)`,
      String.raw`(?<punct>[{}();:,]+)`,
    ].join("|"),
    "g",
  ),
};

/**
 * Highlight `code` and return HTML.
 *
 * The output is a flat run of `<span>`s; every character of the input appears
 * exactly once, escaped, so the rendered text is identical to the source.
 *
 * @example
 * highlight('const x = "hi";', "ts")
 * // '<span class="…">const</span> x <span class="…">=</span> …'
 */
export function highlight(code: string, language: Language = "ts"): string {
  const pattern = GRAMMAR[language];
  if (!pattern) return escapeHtml(code);

  // `lastIndex` is shared state on a global regex, so reset before each run.
  pattern.lastIndex = 0;

  let out = "";
  let cursor = 0;

  for (const match of code.matchAll(pattern)) {
    const groups = match.groups;
    if (!groups) continue;

    const kind = (Object.keys(groups) as TokenKind[]).find(
      (key) => groups[key] !== undefined,
    );
    if (!kind) continue;

    const index = match.index ?? 0;
    // Text between the previous match and this one is plain.
    if (index > cursor) out += escapeHtml(code.slice(cursor, index));

    const text = match[0];
    // Bash commands capture their leading whitespace; keep it outside the span
    // so indentation is never coloured.
    const leading = text.length - text.trimStart().length;
    if (leading > 0) {
      out += escapeHtml(text.slice(0, leading));
      out += `<span class="${CLASS[kind]}">${escapeHtml(text.slice(leading))}</span>`;
    } else {
      out += `<span class="${CLASS[kind]}">${escapeHtml(text)}</span>`;
    }

    cursor = index + text.length;
  }

  out += escapeHtml(code.slice(cursor));
  return out;
}

/** Map a token format name onto the grammar that renders it best. */
export function languageForFormat(format: string): Language {
  switch (format) {
    case "css":
    case "tailwind":
    case "shadcn":
    case "scss":
      return "css";
    case "json":
    case "dtcg":
      return "json";
    case "svg":
      return "ts";
    default:
      return "ts";
  }
}
