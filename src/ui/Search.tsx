import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Search as SearchIcon } from "lucide-react";
import { useAllFiles, useAnnouncements, useContents, useCourses, useSession, useShownIds, useTodo } from "../lib/data";
import { go } from "../lib/router";
import { dateOf, whenLabel } from "../lib/format";
import { courseVar } from "./Cover";
import { FileTile, KindIcon, kindOf } from "./kinds";
import { useUi, type ActivityTarget } from "./ui";

interface Hit {
  id: string;
  group: string;
  title: string;
  sub: string;
  color?: number;
  icon: ReactNode;
  run: () => void;
  score: number;
}

function score(text: string, q: string): number {
  const t = text.toLowerCase();
  if (t.startsWith(q)) return 3;
  if (t.split(/[\s:_\-.]+/).some((w) => w.startsWith(q))) return 2;
  return t.includes(q) ? 1 : 0;
}

export function SearchPalette() {
  const { searchOpen, setSearchOpen } = useUi();
  if (!searchOpen) return null;
  return <Palette close={() => setSearchOpen(false)} />;
}

function Palette({ close }: { close: () => void }) {
  const { t } = useSession();
  const { openActivity, toast } = useUi();
  const { shown, byId } = useCourses();
  const ids = useShownIds();
  const todo = useTodo();
  const contents = useContents(ids);
  const { files } = useAllFiles();
  const news = useAnnouncements();
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useEffect(() => {
    input.current?.focus();
    const prev = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
      prev?.focus?.();
    };
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const query = q.trim().toLowerCase();
    const out: Hit[] = [];
    const open = (a: ActivityTarget) => () => {
      close();
      openActivity(a);
    };
    for (const c of shown) {
      const s = query ? Math.max(score(c.code, query), score(c.name, query), score(c.fullname, query)) : 1;
      if (s)
        out.push({
          id: `c${c.id}`,
          group: "Courses",
          title: c.name,
          sub: c.code,
          color: c.color,
          icon: <span className="kind-icon" style={{ background: "var(--k)", color: "var(--on-k)" }} aria-hidden="true"><b style={{ fontSize: 11 }}>{c.code.slice(0, 4)}</b></span>,
          run: () => {
            close();
            go(`/course/${c.id}`);
          },
          score: s + 1,
        });
    }
    if (!query) {
      for (const e of todo.items.filter((x) => !x.overdue).slice(0, 5)) {
        const c = byId.get(e.course);
        out.push({ id: `t${e.id}`, group: "Coming up", title: e.name, sub: `${c?.code ?? ""}, due ${whenLabel(e.time)}`, color: c?.color, icon: <KindIcon modname={e.module} />, run: open({ course: e.course, module: e.module, instance: e.instance, name: e.name, time: e.time, url: e.url }), score: 1 });
      }
      return out;
    }
    for (const e of todo.items) {
      const s = score(e.name, query);
      const c = byId.get(e.course);
      if (s) out.push({ id: `t${e.id}`, group: "To do", title: e.name, sub: `${c?.code ?? ""}, due ${whenLabel(e.time)}`, color: c?.color, icon: <KindIcon modname={e.module} />, run: open({ course: e.course, module: e.module, instance: e.instance, name: e.name, time: e.time, url: e.url }), score: s + 0.5 });
    }
    const inTodo = new Set(todo.items.map((e) => `${e.module}:${e.instance}`));
    for (const id of ids) {
      const c = byId.get(id);
      for (const sec of contents[`contents:${id}`]?.data ?? [])
        for (const m of sec.mods) {
          if (m.modname === "label" || m.modname === "resource" || inTodo.has(`${m.modname}:${m.instance}`)) continue;
          const s = score(m.name, query);
          if (s) out.push({ id: `m${m.id}`, group: "Activities", title: m.name, sub: `${c?.code ?? ""}, ${kindOf(m.modname).label.toLowerCase()} in ${sec.name}`, color: c?.color, icon: <KindIcon modname={m.modname} />, run: open({ course: id, module: m.modname, instance: m.instance, cmid: m.id, name: m.name, url: m.url }), score: s });
        }
    }
    for (const f of files) {
      const s = Math.max(score(f.name, query), score(f.module, query) * 0.8);
      const c = byId.get(f.course);
      if (s)
        out.push({
          id: `f${f.course}${f.url}`,
          group: "Files",
          title: f.name,
          sub: `${c?.code ?? ""}, ${f.section}, ${dateOf(f.modified)}`,
          color: c?.color,
          icon: <FileTile name={f.name} />,
          run: () => {
            const url = t.fileUrl(f.url);
            if (url) window.open(url, "_blank", "noopener");
            else toast(t.demo ? "Sample file. Connect your account to open real files." : "This file can't be opened from here.");
          },
          score: s,
        });
    }
    for (const n of news.data ?? []) {
      const s = Math.max(score(n.subject, query), 0);
      const c = byId.get(n.course);
      if (s) out.push({ id: `n${n.id}`, group: "Announcements", title: n.subject, sub: `${c?.code ?? ""}, ${n.author}`, color: c?.color, icon: <KindIcon modname="forum" />, run: () => { close(); go("/inbox?tab=news"); }, score: s });
    }
    const order = ["Courses", "To do", "Activities", "Files", "Announcements"];
    return out
      .sort((a, b) => order.indexOf(a.group) - order.indexOf(b.group) || b.score - a.score)
      .reduce<Hit[]>((acc, h) => (acc.filter((x) => x.group === h.group).length < 8 ? [...acc, h] : acc), []);
  }, [q, shown, todo.items, ids, contents, files, news.data, byId, close, openActivity, t, toast]);

  useEffect(() => setSel(0), [q]);
  useEffect(() => {
    list.current?.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: "nearest" });
  }, [sel]);

  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") close();
    else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSel((s) => Math.min(hits.length - 1, s + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSel((s) => Math.max(0, s - 1));
    } else if (e.key === "Enter" && hits[sel]) {
      e.preventDefault();
      hits[sel].run();
    }
  };

  let lastGroup = "";
  return (
    <>
      <div className="scrim" onClick={close} />
      <div className="palette" role="dialog" aria-modal="true" aria-label="Search" onKeyDown={onKey}>
        <div className="palette-input">
          <SearchIcon />
          <input
            ref={input}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search courses, assignments, files"
            aria-label="Search"
            role="combobox"
            aria-expanded="true"
            aria-controls="palette-list"
            aria-activedescendant={hits[sel] ? `hit-${sel}` : undefined}
            autoComplete="off"
            spellCheck={false}
          />
          <button className="btn ghost sm" type="button" onClick={close}>
            Close
          </button>
        </div>
        <div className="palette-results" id="palette-list" role="listbox" ref={list}>
          {hits.length === 0 && <p className="empty" style={{ padding: "18px 12px" }}>{q ? `Nothing matches "${q}".` : "Start typing to search."}</p>}
          {hits.map((h, i) => {
            const head = h.group !== lastGroup ? <div className="palette-group">{h.group}</div> : null;
            lastGroup = h.group;
            return (
              <div key={h.id}>
                {head}
                <button
                  id={`hit-${i}`}
                  type="button"
                  role="option"
                  aria-selected={i === sel}
                  className="palette-item"
                  style={h.color != null ? courseVar(h.color) : undefined}
                  onMouseMove={() => setSel(i)}
                  onClick={h.run}
                >
                  {h.icon}
                  <span style={{ minWidth: 0 }}>
                    <b>{h.title}</b>
                    <small>{h.sub}</small>
                  </span>
                  <span className="kbd">Enter</span>
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}
