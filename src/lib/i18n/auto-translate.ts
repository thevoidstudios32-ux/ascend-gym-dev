/* ASCEND — tradução automática da tela.
   Muitos textos são escritos direto no JSX (sem t()). Quando o idioma não é o português,
   este módulo troca na tela cada texto (e placeholder/title/aria-label/alt) que tenha
   tradução no dicionário. Chaves com {variáveis} viram padrões: "de {need} XP" traduz
   "de 500 XP". Ao voltar ao idioma original, os textos são restaurados.
   Conteúdo digitado pelo usuário (inputs, textareas, [data-no-translate]) nunca é tocado. */

type Dict = Record<string, string>;
type Pattern = { re: RegExp; names: string[]; target: string };

const ATTRS = ["placeholder", "title", "aria-label", "alt"] as const;
const SKIP = "script,style,noscript,textarea,input,code,pre,[contenteditable='true'],[data-no-translate]";
const MONTHS_EN: Record<string, string> = {
  janeiro: "January", fevereiro: "February", março: "March", abril: "April", maio: "May", junho: "June",
  julho: "July", agosto: "August", setembro: "September", outubro: "October", novembro: "November", dezembro: "December",
};

let dict: Dict = {};
let patterns: Pattern[] = [];
let monthsToEnglish = false;
let observer: MutationObserver | null = null;
// texto original e último texto aplicado, por nó (para restaurar e para ignorar nossas próprias mudanças)
const textOriginal = new Map<Text, string>();
const textApplied = new WeakMap<Text, string>();
const attrOriginal = new Map<Element, Record<string, string>>();
const attrApplied = new WeakMap<Element, Record<string, string>>();

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function compile(d: Dict): Pattern[] {
  return Object.keys(d)
    .filter((k) => /\{\w+\}/.test(k) && /[^{}\s\w]|\w{2,}/.test(k.replace(/\{\w+\}/g, "")))
    .map((k) => {
      const names: string[] = [];
      const src = k
        .split(/(\{\w+\})/)
        .map((part) => {
          const m = /^\{(\w+)\}$/.exec(part);
          if (m) {
            names.push(m[1]!);
            return "(.+?)";
          }
          return escapeRe(part);
        })
        .join("");
      return { re: new RegExp(`^${src}$`), names, target: d[k]! };
    })
    // padrões mais específicos (mais texto fixo) primeiro
    .sort((a, b) => b.re.source.replace(/\(\.\+\?\)/g, "").length - a.re.source.replace(/\(\.\+\?\)/g, "").length);
}

function translateCore(core: string, depth = 0): string | null {
  const direct = dict[core];
  if (direct !== undefined) return direct;
  if (monthsToEnglish) {
    const month = /^([A-Za-zÀ-ú]+) de (\d{4})$/.exec(core);
    const en = month && MONTHS_EN[month[1]!.toLowerCase()];
    if (en) return `${en} ${month![2]}`;
  }
  if (depth > 2) return null;
  for (const p of patterns) {
    const m = p.re.exec(core);
    if (!m) continue;
    let out = p.target;
    p.names.forEach((name, i) => {
      const value = m[i + 1] ?? "";
      out = out.split(`{${name}}`).join(translateCore(value.trim(), depth + 1) ?? value);
    });
    return out;
  }
  return null;
}

/** Traduz um texto preservando os espaços das pontas; null se não houver tradução. */
export function translateText(text: string): string | null {
  const core = text.replace(/\s+/g, " ").trim();
  if (!core || !/[A-Za-zÀ-ú]/.test(core)) return null;
  const out = translateCore(core);
  if (out === null || out === core) return null;
  const lead = /^\s*/.exec(text)![0];
  const trail = /\s*$/.exec(text)![0];
  return lead + out + trail;
}

const skipped = (el: Element | null) => !el || !!el.closest(SKIP);

function handleText(node: Text) {
  if (skipped(node.parentElement)) return;
  const value = node.nodeValue ?? "";
  if (textApplied.get(node) === value) return; // mudança feita por nós
  const translated = translateText(value);
  if (translated === null) return;
  if (textOriginal.size > 4000) textOriginal.forEach((_, n) => !n.isConnected && textOriginal.delete(n));
  textOriginal.set(node, value);
  textApplied.set(node, translated);
  node.nodeValue = translated;
}

function handleAttrs(el: Element) {
  if (skipped(el)) return;
  for (const name of ATTRS) {
    const value = el.getAttribute(name);
    if (!value) continue;
    const applied = attrApplied.get(el) ?? {};
    if (applied[name] === value) continue;
    const translated = translateText(value);
    if (translated === null) continue;
    const original = attrOriginal.get(el) ?? {};
    original[name] = value;
    attrOriginal.set(el, original);
    applied[name] = translated;
    attrApplied.set(el, applied);
    el.setAttribute(name, translated);
  }
}

function walk(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) return handleText(root as Text);
  if (root.nodeType !== Node.ELEMENT_NODE) return;
  const el = root as Element;
  if (el.matches(SKIP)) return;
  handleAttrs(el);
  el.querySelectorAll("[placeholder],[title],[aria-label],img[alt]").forEach(handleAttrs);
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) handleText(walker.currentNode as Text);
}

/** Liga a tradução da tela com o dicionário dado (troca o anterior, se houver). */
export function startAutoTranslate(dictionary: Dict, options: { months?: boolean } = {}) {
  if (typeof document === "undefined") return;
  stopAutoTranslate();
  dict = dictionary;
  patterns = compile(dictionary);
  monthsToEnglish = !!options.months;
  walk(document.body);
  observer = new MutationObserver((records) => {
    for (const r of records) {
      if (r.type === "characterData") handleText(r.target as Text);
      else if (r.type === "attributes") handleAttrs(r.target as Element);
      else r.addedNodes.forEach(walk);
    }
  });
  observer.observe(document.body, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [...ATTRS],
  });
}

/** Desliga e devolve os textos originais aos nós que ainda estão na tela. */
export function stopAutoTranslate() {
  observer?.disconnect();
  observer = null;
  textOriginal.forEach((original, node) => {
    if (node.isConnected && node.nodeValue === textApplied.get(node)) node.nodeValue = original;
  });
  attrOriginal.forEach((originals, el) => {
    const applied = attrApplied.get(el) ?? {};
    if (!el.isConnected) return;
    for (const [name, original] of Object.entries(originals)) {
      if (el.getAttribute(name) === applied[name]) el.setAttribute(name, original);
    }
  });
  textOriginal.clear();
  attrOriginal.clear();
}
