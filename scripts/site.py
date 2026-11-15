"""Generate the reader-facing 787compendium site (one self-contained HTML page) from the workbook.
Usage: python site.py <Compendium.xlsx> <out.html> [download-file-name]
"""
import sys, json, datetime, html
import openpyxl

SRC, OUT = sys.argv[1:3]
DOWNLOAD = sys.argv[3] if len(sys.argv) > 3 else None   # optional: file name of the workbook copy published next to the page
wb = openpyxl.load_workbook(SRC)

def rows(name):
    ws = wb[name]
    hdr = [c.value for c in ws[1]]
    out = []
    for r in range(2, ws.max_row + 1):
        rec = {}
        for c, h in enumerate(hdr, 1):
            cell = ws.cell(r, c)
            v = cell.value
            if isinstance(v, str) and v.startswith("="): v = None          # formulas rebuilt client-side
            if isinstance(v, datetime.datetime): v = v.strftime("%Y-%m-%d")
            rec[h] = v
            if cell.hyperlink: rec[h + "__url"] = cell.hyperlink.target
        if any(v not in (None, "") for v in rec.values()): out.append(rec)
    return out

videos = rows("Videos")
data = {
    "videos": [{"id": v["ID"], "date": v["Date"], "title": v["Title"], "type": v["Type"], "patch": v["Patch"], "url": v["URL"]} for v in videos],
    "builds": [{"id": b["Build ID"], "name": b["Build"], "version": b["Version"], "nick": b["Nickname"], "cls": b["Class"],
                "asc": b["Ascendancy"], "skills": b["Main skill(s)"], "status": b["Status"], "patch": b["Patch"],
                "checked": b["Last checked"], "ninja": b.get("poe.ninja__url"), "ninjaNote": None if b.get("poe.ninja__url") else b["poe.ninja"],
                "moba": b.get("Mobalytics__url"), "tech": b["Key Tech"], "mech": b["Mechanics used"], "family": b["Family"],
                "supersededBy": b["Superseded by"], "video": b["Video"]} for b in rows("Builds")],
    "mechanics": [{"id": m["ID"], "name": m["Mechanic"], "type": m["Type"], "desc": m["Description"], "notes": m["Notes"],
                   "notesUrl": m.get("Notes__url"), "patch": m["Patch"], "video": m["Video"], "more": m["More sources"]} for m in rows("Mechanics")],
    "changes": [{"patch": c["Patch"], "item": c["Item / node / mechanic"], "what": c["What changed"], "affects": c["Affected build(s)"],
                 "source": c["Source"], "video": c["Video"]} for c in rows("Patch Changes")],
    "toc": [{"section": t["Section"], "topic": t["Topic"], "note": t["Note"], "patch": t["Patch"], "video": t["Video"]} for t in rows("Trial of Chaos")],
    "mindset": [{"cat": m["Category"], "title": m["Title"], "text": m["Takeaway"], "video": m["Video"], "more": m["More sources"]} for m in rows("Mindset")],
}
latest = max(data["videos"], key=lambda v: v["date"])
data["updated"] = latest["date"]
payload = json.dumps(data, ensure_ascii=False).replace("</", "<\\/")

TEMPLATE = open(__file__.replace("site.py", "site_template.html"), encoding="utf-8").read()
page = TEMPLATE.replace("/*__DATA__*/null", payload)
if DOWNLOAD:
    page = page.replace("<!--__DOWNLOAD__-->", f' <a href="{html.escape(DOWNLOAD)}">Download the spreadsheet (.xlsx)</a>.')
open(OUT, "w", encoding="utf-8").write(page)
print("wrote", OUT, "| builds", len(data["builds"]), "| mechanics", len(data["mechanics"]), "| videos", len(data["videos"]))
