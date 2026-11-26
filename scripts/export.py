"""Turn the Codex workbook into the JSON file the website is built from.

Usage: python scripts/export.py compendium.xlsx site/src/data/codex.json

It also prints warnings for things worth fixing in the workbook (a missing video ID,
a Key Tech cell that runs past three sentences, and so on). Warnings never stop the build.
"""
import sys, json, datetime, re, os
import openpyxl

SRC, OUT = sys.argv[1:3]
wb = openpyxl.load_workbook(SRC)
warnings = []


def rows(name):
    ws = wb[name]
    hdr = [c.value for c in ws[1]]
    out = []
    for r in range(2, ws.max_row + 1):
        rec = {"_row": r}
        for c, h in enumerate(hdr, 1):
            if h is None:
                continue
            cell = ws.cell(r, c)
            v = cell.value
            if isinstance(v, str) and v.startswith("="):
                v = None  # formula columns (Watch links) are rebuilt on the site
            if isinstance(v, datetime.datetime):
                v = v.strftime("%Y-%m-%d")
            if isinstance(v, str):
                v = v.strip() or None
            rec[h] = v
            if cell.hyperlink:
                rec[h + "__url"] = cell.hyperlink.target
        if any(v not in (None, "") for k, v in rec.items() if k != "_row"):
            out.append(rec)
    return out


def slugify(s):
    s = str(s or "").lower().replace("&", " and ").replace("’", "").replace("'", "")
    return re.sub(r"[^a-z0-9]+", "-", s).strip("-")


def unique_slugs(items, base):
    seen = {}
    for it in items:
        s = slugify(base(it)) or it["id"].lower()
        if s in seen:
            seen[s] += 1
            s = f"{s}-{seen[s]}"
        else:
            seen[s] = 1
        it["slug"] = s


def split_list(s, sep=r"\s*[·,]\s*"):
    return [x for x in re.split(sep, s or "") if x]


def sentences(s):
    return len(re.findall(r"[.!?](\s|$)", s or ""))


videos = [{"id": v["ID"], "date": v["Date"], "title": v["Title"], "type": v["Type"], "patch": v["Patch"], "url": v["URL"]}
          for v in rows("Videos")]
vids = {v["id"] for v in videos}

builds = [{"id": b["Build ID"], "name": b["Build"], "version": b["Version"], "nick": b["Nickname"], "cls": b["Class"],
           "asc": b["Ascendancy"], "skills": b["Main skill(s)"], "status": b["Status"], "patch": b["Patch"],
           "checked": b["Last checked"], "ninja": b.get("poe.ninja__url"),
           "ninjaNote": None if b.get("poe.ninja__url") else b["poe.ninja"],
           "moba": b.get("Mobalytics__url"), "tech": b["Key Tech"], "mech": b["Mechanics used"],
           "family": b["Family"], "supersededBy": b["Superseded by"], "video": b["Video"], "_row": b["_row"]}
          for b in rows("Builds")]
mechanics = [{"id": m["ID"], "name": m["Mechanic"], "type": m["Type"], "desc": m["Description"], "notes": m["Notes"],
              "notesUrl": m.get("Notes__url"), "patch": m["Patch"], "video": m["Video"],
              "full": m.get("Full description"),
              "more": split_list(m["More sources"]), "_row": m["_row"]} for m in rows("Mechanics")]
changes = [{"patch": c["Patch"], "item": c["Item / node / mechanic"], "what": c["What changed"],
            "affects": c["Affected build(s)"], "source": c["Source"], "video": c["Video"],
            "buildIdsCol": c.get("Build IDs"), "_row": c["_row"]}
           for c in rows("Patch Changes")]
toc = [{"section": t["Section"], "topic": t["Topic"], "note": t["Note"], "patch": t["Patch"], "video": t["Video"],
        "_row": t["_row"]} for t in rows("Trial of Chaos")]
mindset = [{"cat": m["Category"], "title": m["Title"], "text": m["Takeaway"], "full": m.get("Full write-up"), "video": m["Video"],
            "more": split_list(m["More sources"]), "_row": m["_row"]} for m in rows("Mindset")]

unique_slugs(builds, lambda b: b["name"] + (" " + b["version"] if b["version"] else ""))
unique_slugs(mechanics, lambda m: m["name"])
for i, m in enumerate(mindset):
    m["id"] = f"p{i + 1}"
unique_slugs(mindset, lambda m: m["title"])


# --- link builds and mechanics -------------------------------------------------
def norm(s):
    return re.sub(r"[^a-z0-9]+", " ", re.sub(r"\(.*?\)", "", (s or "").lower())).strip()


STOP = {"on", "the", "a", "an", "and", "of", "vs", "as", "with", "for", "to", "s"}


def words(s):
    return [w[:-1] if len(w) > 4 and w.endswith("s") else w for w in norm(s).split() if w not in STOP]


mech_words = [(m["id"], words(m["name"])) for m in mechanics]

# A build's "Mechanics used" entry links to a mechanic only when its words are the
# opening words of that mechanic's name ("Wolf Pack loop" does not match, "Culling Strike" does).
for b in builds:
    b["mechIds"], b["mechParts"] = [], []
    for part in split_list(b["mech"], r"\s*·\s*"):
        w = words(part)
        hits = [mid for mid, mw in mech_words if w and mw[:len(w)] == w] if not (len(w) == 1 and len(w[0]) < 4) else []
        mid = hits[0] if len(hits) == 1 else None
        b["mechParts"].append({"text": part, "id": mid})
        if mid and mid not in b["mechIds"]:
            b["mechIds"].append(mid)

# --- which builds each patch change affects ----------------------------------------
# An optional "Build IDs" column on the Patch Changes tab (e.g. "B03, B20") is used as-is.
# Otherwise build names are matched in the "Affected build(s)" text before each " — ".
# When several versions share a name, a version word in the text picks one ("Original");
# otherwise the newest non-superseded version is used.
def affected_builds(change):
    if change.get("buildIdsCol"):
        return [i for i in split_list(change["buildIdsCol"]) if any(b["id"] == i for b in builds)]
    text = change["affects"] or ""
    if re.search(r"not tied to a specific build|no builds tab entry", text, re.I):
        return []
    ids = []
    for sentence in re.split(r"(?<=\.)\s+", text):
        # keep words in brackets here: "Frog Build (Poisonburst Oracle)"
        head = re.sub(r"[^a-z0-9]+", " ", sentence.split(" — ")[0].lower()).strip()
        for name in sorted({b["name"] for b in builds}, key=len, reverse=True):
            if not re.search(r"(?<![a-z0-9])" + re.escape(norm(name)) + r"(?![a-z0-9])", head):
                continue
            same = [b for b in builds if b["name"] == name]
            pick = [b for b in same if b["version"] and norm(b["version"]).split()[0] in head.split()]
            if not pick:
                pick = [b for b in same if b["status"] != "Superseded"][:1] or same[:1]
            for b in pick:
                if b["id"] not in ids:
                    ids.append(b["id"])
            head = head.replace(norm(name), " ")
    return ids


for c in changes:
    c["buildIds"] = affected_builds(c)
    c.pop("buildIdsCol", None)
for b in builds:
    b["changeIdx"] = [i for i, c in enumerate(changes) if b["id"] in c["buildIds"]]

# --- short names used to link mechanics inside text ("Culling Strike", "Hollow Palm Technique")
# The name a mechanic starts with, up to the first lowercase word or "+", plus any build
# "Mechanics used" entry that matched it. Vague single words are skipped.
VAGUE = {"how", "order", "choosing", "checking", "treat", "attack", "area", "projectile", "crafting",
         "overlapping", "concoction", "berserk", "charge", "mana", "weapon", "reduced", "cast"}
CONNECT = {"on", "of", "the"}


def lead_phrase(name):
    toks = []
    for t in re.split(r"\s+", re.split(r"[:(+—]", name)[0].strip()):
        if t[:1].isupper() or (toks and t in CONNECT):
            toks.append(t)
        else:
            break
    while toks and toks[-1] in CONNECT:
        toks.pop()
    return " ".join(toks).strip("'\"")


phrase_owner = {}
for m in mechanics:
    cands = [lead_phrase(m["name"])] + [p["text"] for b in builds for p in b["mechParts"] if p["id"] == m["id"]]
    if m["name"].lower().startswith("reduced skill effect duration"):
        cands.append("reduced skill effect duration")
    for c in cands:
        c = c.strip()
        if not c or "+" in c or "/" in c or len(c) < 4:
            continue
        if " " not in c and (c.lower() in VAGUE or "-" in c):
            continue
        phrase_owner.setdefault(c, m["id"])
link_phrases = sorted(({"text": t, "id": i} for t, i in phrase_owner.items()), key=lambda x: -len(x["text"]))

by_name = {}
for b in builds:
    by_name.setdefault(norm(b["name"]), b["id"])
for b in builds:
    b["supersededById"] = by_name.get(norm(b["supersededBy"])) if b["supersededBy"] else None
    # older versions that point at this build
for b in builds:
    b["olderIds"] = [o["id"] for o in builds if o["supersededById"] == b["id"]]

# --- checks --------------------------------------------------------------------
def warn(tab, row, msg):
    warnings.append(f"{tab} row {row}: {msg}")


for b in builds:
    if not b["id"]:
        warn("Builds", b["_row"], "missing Build ID")
    if b["video"] and b["video"] not in vids:
        warn("Builds", b["_row"], f"video {b['video']} is not on the Videos tab")
    if sentences(b["tech"]) > 3:
        warn("Builds", b["_row"], f"Key Tech runs to {sentences(b['tech'])} sentences (aim for 3)")
    if b["supersededBy"] and not b["supersededById"]:
        warn("Builds", b["_row"], f"'Superseded by' doesn't match a build name: {b['supersededBy']}")
for tab, items in (("Mechanics", mechanics), ("Patch Changes", changes), ("Trial of Chaos", toc), ("Mindset", mindset)):
    for it in items:
        refs = [it.get("video")] + list(it.get("more") or [])
        for ref in refs:
            if ref and ref not in vids:
                warn(tab, it["_row"], f"video {ref} is not on the Videos tab")

for coll in (builds, mechanics, changes, toc, mindset):
    for it in coll:
        it.pop("_row", None)

data = {"linkPhrases": link_phrases, "videos": videos, "builds": builds, "mechanics": mechanics, "changes": changes, "toc": toc, "mindset": mindset,
        "updated": max(v["date"] for v in videos if v["date"])}
os.makedirs(os.path.dirname(OUT) or ".", exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=1)

print(f"wrote {OUT} | builds {len(builds)} | mechanics {len(mechanics)} | videos {len(videos)}")
for w in warnings:
    print("warning:", w)
    if "GITHUB_ACTIONS" in __import__("os").environ:
        print(f"::warning title=Workbook check::{w}")
