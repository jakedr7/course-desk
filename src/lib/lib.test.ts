import { describe, expect, it } from "vitest";
import { flatten, normaliseSite, httpTransport, extractKey } from "./moodle";
import { courseCode, shapeCourses } from "./courses";
import { countdown, gradePercent, DAY } from "./format";
import { parseHash } from "./router";

describe("flatten", () => {
  it("encodes nested params the way Moodle expects", () => {
    expect(flatten({ courseids: [3, 7], options: { timestart: 10, userevents: true }, skip: undefined })).toEqual([
      ["courseids[0]", "3"],
      ["courseids[1]", "7"],
      ["options[timestart]", "10"],
      ["options[userevents]", "1"],
    ]);
  });
  it("handles arrays of objects", () => {
    expect(flatten({ events: [{ id: 1 }] })).toEqual([["events[0][id]", "1"]]);
  });
});

describe("normaliseSite", () => {
  it("accepts a bare host", () => expect(normaliseSite("myelearning.sta.uwi.edu")).toBe("https://myelearning.sta.uwi.edu"));
  it("strips page paths", () => expect(normaliseSite("https://myelearning.sta.uwi.edu/login/index.php")).toBe("https://myelearning.sta.uwi.edu"));
  it("keeps a subdirectory install", () => expect(normaliseSite("https://uni.edu/moodle/my/")).toBe("https://uni.edu/moodle"));
  it("rejects plain http on the internet", () => expect(normaliseSite("http://uni.edu")).toBeNull());
  it("allows http on localhost for development", () => expect(normaliseSite("http://localhost:9901")).toBe("http://localhost:9901"));
  it("rejects nonsense", () => expect(normaliseSite("not a site")).toBeNull());
});

describe("fileUrl", () => {
  const t = httpTransport("https://uni.edu/moodle", "abc");
  it("adds the key only for the student's own site", () => {
    expect(t.fileUrl("https://uni.edu/moodle/webservice/pluginfile.php/1/x.pdf?forcedownload=1")).toBe("https://uni.edu/moodle/webservice/pluginfile.php/1/x.pdf?token=abc");
    expect(t.fileUrl("https://evil.example/x.pdf")).toBeNull();
  });
  it("routes plain pluginfile links through the web service", () => {
    expect(t.fileUrl("https://uni.edu/moodle/pluginfile.php/1/x.png")).toBe("https://uni.edu/moodle/webservice/pluginfile.php/1/x.png?token=abc");
  });
});

describe("courses", () => {
  it("finds course codes", () => {
    expect(courseCode("COMP2611-S1-2026")).toBe("COMP2611");
    expect(courseCode("comp 2611 data structures")).toBe("COMP2611");
    expect(courseCode("WRITING-CENTRE")).toBeNull();
  });
  it("keeps the newest offering and this semester's courses", () => {
    const now = 1_800_000_000;
    const raw = [
      { id: 1, shortname: "COMP2611-S1-2026", fullname: "Data Structures", startdate: now - 40 * DAY, enddate: now + 60 * DAY, hidden: false },
      { id: 2, shortname: "COMP2611-S1-2024", fullname: "Data Structures", startdate: now - 800 * DAY, enddate: now - 700 * DAY, hidden: false },
      { id: 3, shortname: "WRITING", fullname: "Writing Centre", startdate: now - 900 * DAY, enddate: 0, hidden: false },
    ];
    const list = shapeCourses(raw, "https://x.edu", {}, {}, now);
    const byId = Object.fromEntries(list.map((c) => [c.id, c]));
    expect(byId[1].shown).toBe(true);
    expect(byId[2].older).toBe(true);
    expect(byId[2].shown).toBe(false);
    expect(byId[3].shown).toBe(false);
  });
  it("respects the student's choices", () => {
    const now = 1_800_000_000;
    const raw = [{ id: 3, shortname: "WRITING", fullname: "Writing Centre", startdate: now - 9 * DAY, enddate: 0, hidden: false }];
    const [c] = shapeCourses(raw, "https://x.edu", { shown: { 3: true }, nick: { 3: "Writing" }, color: { 3: 5 } }, {}, now);
    expect(c.shown).toBe(true);
    expect(c.name).toBe("Writing");
    expect(c.color).toBe(5);
  });
});

describe("format", () => {
  it("counts down in the two most useful units", () => {
    expect(countdown(DAY + 15 * 3600 + 20)).toEqual([[1, "day"], [15, "hours"]]);
    expect(countdown(9 * DAY)).toEqual([[9, "days"]]);
    expect(countdown(3 * 3600 + 5 * 60)).toEqual([[3, "hours"], [5, "min"]]);
    expect(countdown(30)).toEqual([[1, "minute"]]);
  });
  it("reads percentages from Moodle's grade text", () => {
    expect(gradePercent("81.00 %")).toBe(81);
    expect(gradePercent("B+ (78.50 %)")).toBe(78.5);
    expect(gradePercent("72.50")).toBeNull();
  });
});

describe("router", () => {
  it("parses course routes", () => {
    const r = parseHash("#/course/103/files");
    expect(r.page).toBe("course");
    expect(r.id).toBe(103);
    expect(r.tab).toBe("files");
  });
  it("defaults to home and keeps query params", () => {
    expect(parseHash("").page).toBe("home");
    expect(parseHash("#/calendar?d=2026-10-01").params.get("d")).toBe("2026-10-01");
  });
});

describe("extractKey", () => {
  const key = "0123456789abcdef0123456789abcdef";
  it("reads a plain key", () => expect(extractKey(`  ${key.toUpperCase()} `)).toBe(key));
  it("reads the Moodle app sign-in link", () => {
    const b64 = btoa(`d41d8cd98f00b204e9800998ecf8427e:::${key}:::privatetoken123`);
    expect(extractKey(`Failed to launch 'moodlemobile://token=${b64}' because the scheme has no handler`)).toBe(key);
  });
  it("rejects anything else", () => expect(extractKey("hello")).toBeNull());
});
