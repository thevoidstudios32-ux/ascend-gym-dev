import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ASSESSMENT_MUSCLES } from "@/lib/training-assessment";

type Region = { name: string; paths: string[] };
const front: Region[] = [
  { name: "Peitoral", paths: ["M91 84 Q108 77 119 87 L118 113 Q98 116 86 99Z", "M149 84 Q132 77 121 87 L122 113 Q142 116 154 99Z"] },
  { name: "Ombros", paths: ["M87 79 Q66 77 62 102 L81 109 91 88Z", "M153 79 Q174 77 178 102 L159 109 149 88Z"] },
  { name: "Bíceps", paths: ["M62 105 L80 112 74 148 56 145Z", "M178 105 L160 112 166 148 184 145Z"] },
  { name: "Antebraços", paths: ["M55 150 L72 151 62 194 46 190Z", "M185 150 L168 151 178 194 194 190Z"] },
  { name: "Abdômen", paths: ["M99 118 L141 118 139 170 121 180 101 170Z"] },
  { name: "Quadríceps", paths: ["M89 195 L117 194 115 258 98 266 86 249Z", "M151 195 L123 194 125 258 142 266 154 249Z"] },
  { name: "Panturrilhas", paths: ["M99 278 L114 275 111 324 100 328 94 304Z", "M141 278 L126 275 129 324 140 328 146 304Z"] },
];
const back: Region[] = [
  { name: "Trapézio", paths: ["M104 70 L136 70 155 90 121 117 85 90Z"] },
  { name: "Ombros", paths: front[1]?.paths ?? [] },
  { name: "Tríceps", paths: front[2]?.paths ?? [] },
  { name: "Antebraços", paths: front[3]?.paths ?? [] },
  { name: "Dorsais", paths: ["M87 101 L118 121 116 156 99 166 85 130Z", "M153 101 L122 121 124 156 141 166 155 130Z"] },
  { name: "Lombar", paths: ["M106 154 L134 154 141 178 121 188 99 178Z"] },
  { name: "Glúteos", paths: ["M90 182 Q104 177 119 190 L117 217 Q101 224 86 208Z", "M150 182 Q136 177 121 190 L123 217 Q139 224 154 208Z"] },
  { name: "Posterior de coxa", paths: ["M88 222 L116 224 113 260 97 268 87 251Z", "M152 222 L124 224 127 260 143 268 153 251Z"] },
  { name: "Panturrilhas", paths: front[6]?.paths ?? [] },
];
export function MuscleMap({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [view, setView] = useState<"front" | "back">("front");
  const toggle = (name: string) => onChange(value.includes(name) ? value.filter(v => v !== name) : value.length < 5 ? [...value, name] : value);
  return <div className="space-y-4">
    <div className="flex items-center justify-between gap-2">
      <div className="flex gap-2">{(["front", "back"] as const).map(v => <Button key={v} type="button" variant={view === v ? "default" : "secondary"} aria-pressed={view === v} onClick={() => setView(v)}>{v === "front" ? "Vista frontal" : "Vista posterior"}</Button>)}</div>
      <span className="text-sm font-bold text-primary">{value.length}/5</span>
    </div>
    <svg viewBox="0 0 240 370" className="mx-auto h-[370px] max-w-full" aria-label={`Modelo muscular — ${view === "front" ? "frente" : "costas"}`}>
      <g className="pointer-events-none fill-elevated stroke-border" strokeWidth="2">
        <ellipse cx="120" cy="39" rx="21" ry="27" />
        <path d="M107 64 L105 74 Q70 72 63 94 L51 146 41 195 44 212 54 216 65 195 79 153 86 127 96 170 85 195 83 246 95 277 93 310 99 341 91 349 91 357 116 357 117 324 119 279 120 229 121 279 123 324 124 357 149 357 149 349 141 341 147 310 145 277 157 246 155 195 144 170 154 127 161 153 175 195 186 216 196 212 199 195 189 146 177 94 Q170 72 135 74 L133 64Z" />
      </g>
      {(view === "front" ? front : back).map(r => <g key={r.name} role="button" tabIndex={0} aria-label={r.name} aria-pressed={value.includes(r.name)} aria-disabled={!value.includes(r.name) && value.length >= 5}
        onClick={() => toggle(r.name)} onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggle(r.name); } }}
        className={`cursor-pointer stroke-background transition-colors focus:outline-none ${value.includes(r.name) ? "fill-primary" : "fill-muted-foreground/40 hover:fill-primary/60 focus:fill-primary/60"}`} strokeWidth="2">
        <title>{r.name}</title>{r.paths.map((d, i) => <path key={i} d={d} />)}
      </g>)}
    </svg>
    <div className="flex flex-wrap gap-2">{ASSESSMENT_MUSCLES.map(m => <Button key={m} type="button" size="sm" variant={value.includes(m) ? "default" : "secondary"} aria-pressed={value.includes(m)} disabled={value.length >= 5 && !value.includes(m)} onClick={() => toggle(m)}>{m}</Button>)}</div>
  </div>;
}