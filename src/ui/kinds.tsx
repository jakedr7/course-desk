import {
  BookA, BookOpen, CalendarCheck, ClipboardCheck, Database, File, FileText, Folder, GraduationCap, Layers, Link,
  ListChecks, MessageCircle, MessagesSquare, Notebook, Package, Plug, ScrollText, Sparkles, Users, Video, Vote,
  type LucideIcon,
} from "lucide-react";
import type { CSSProperties } from "react";
import { extOf } from "../lib/format";

const KINDS: Record<string, [LucideIcon, string]> = {
  assign: [ClipboardCheck, "Assignment"],
  quiz: [ListChecks, "Quiz"],
  forum: [MessagesSquare, "Forum"],
  resource: [FileText, "File"],
  folder: [Folder, "Folder"],
  url: [Link, "Link"],
  page: [ScrollText, "Page"],
  book: [BookOpen, "Book"],
  lesson: [GraduationCap, "Lesson"],
  choice: [Vote, "Poll"],
  feedback: [MessageCircle, "Survey"],
  survey: [MessageCircle, "Survey"],
  scorm: [Package, "Package"],
  imscp: [Package, "Package"],
  h5pactivity: [Sparkles, "Interactive"],
  lti: [Plug, "External tool"],
  workshop: [Users, "Peer review"],
  glossary: [BookA, "Glossary"],
  data: [Database, "Database"],
  wiki: [Notebook, "Wiki"],
  chat: [MessageCircle, "Chat"],
  attendance: [CalendarCheck, "Attendance"],
  zoom: [Video, "Zoom"],
  bigbluebuttonbn: [Video, "Live class"],
  label: [Layers, "Note"],
};

export function kindOf(modname: string): { Icon: LucideIcon; label: string } {
  const k = KINDS[modname];
  return k ? { Icon: k[0], label: k[1] } : { Icon: File, label: modname ? modname[0].toUpperCase() + modname.slice(1) : "Activity" };
}

export function KindIcon({ modname }: { modname: string }) {
  const { Icon } = kindOf(modname);
  return (
    <span className="kind-icon" aria-hidden="true">
      <Icon strokeWidth={2} />
    </span>
  );
}

const FAMILIES: [RegExp, string][] = [
  [/^pdf$/, "#D0342C"],
  [/^(ppt|pptx|key|odp)$/, "#D0701E"],
  [/^(doc|docx|rtf|odt|txt|md)$/, "#2F6BDE"],
  [/^(xls|xlsx|csv|ods)$/, "#1B7A4F"],
  [/^(png|jpe?g|gif|heic|bmp|svg)$/, "#7A4FD6"],
  [/^(zip|rar|7z|tar|gz)$/, "#5E6B7F"],
  [/^(py|java|c|cpp|h|js|ts|sql|ipynb|r|m|html|css|pkt)$/, "#0E8A7B"],
  [/^(mp4|mov|mp3|wav|m4a)$/, "#CB3C69"],
];

export function FileTile({ name }: { name: string }) {
  const ext = extOf(name);
  const color = FAMILIES.find(([re]) => re.test(ext))?.[1];
  return (
    <span className="ftile" aria-hidden="true" style={color ? ({ ["--ft" as string]: color } as CSSProperties) : undefined}>
      {(ext || "file").slice(0, 4).toUpperCase()}
    </span>
  );
}
