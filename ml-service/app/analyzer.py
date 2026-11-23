import os

from .features import compute_metrics, extract_units, to_row
from .model import RiskModel, level
from .smells import class_smells, find_duplicates, unit_smells

model = RiskModel(os.getenv("MODEL_PATH", "model.pkl"))

EXT = {".py": "python", ".js": "javascript", ".jsx": "javascript", ".mjs": "javascript", ".ts": "typescript",
       ".tsx": "typescript", ".java": "java", ".go": "go", ".c": "c", ".cpp": "cpp", ".cs": "csharp"}
SNIPPET_LIMIT = 6000


def language_of(path):
    return EXT.get(os.path.splitext(path)[1].lower())


def analyze_files(files):
    results, dup_input = [], []
    for f in files:
        lang = language_of(f["path"])
        if not lang:
            results.append({"path": f["path"], "language": None, "skipped": True})
            continue
        family = "python" if lang == "python" else "brace"
        units = extract_units(f["content"], family)
        metrics = [compute_metrics(u["code"], family, u["params"]) for u in units]
        probs = model.predict([to_row(m) for m in metrics])
        funcs = []
        for u, m, p in zip(units, metrics, probs):
            funcs.append({
                "name": u["name"], "start": u["start"], "end": u["end"], "metrics": m,
                "risk": round(float(p), 3), "level": level(float(p)),
                "smells": unit_smells(u["name"], u["start"], u["code"], m, family),
                "code": u["code"][:SNIPPET_LIMIT],
            })
        risks = [x["risk"] for x in funcs]
        file_risk = round(0.6 * max(risks) + 0.4 * (sum(risks) / len(risks)), 3)
        results.append({
            "path": f["path"], "language": lang, "family": family,
            "loc": sum(1 for l in f["content"].splitlines() if l.strip()),
            "risk": file_risk, "level": level(file_risk), "functions": funcs,
            "smells": class_smells(f["content"], family),
        })
        dup_input.append((f["path"], f["content"], family))

    dups = find_duplicates(dup_input)
    for r in results:
        r.pop("family", None)
        if not r.get("skipped"):
            r["smells"] += dups.get(r["path"], [])
    return {"model": model.name, "files": results}
