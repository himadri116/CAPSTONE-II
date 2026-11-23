"""Rule-based code smell detection (unit, class and cross-file duplicate level)."""
import ast
import hashlib
import re
from collections import defaultdict

from .features import _JS_PATTERNS, NOT_FUNCS, blank, match_brace


def _s(kind, severity, message, line):
    return {"type": kind, "severity": severity, "message": message, "line": line}


def unit_smells(name, start, code, m, family):
    out = []
    if m["loc"] > 80:
        out.append(_s("long_method", "high", f"{name} is {m['loc']} lines long; split it into smaller functions.", start))
    elif m["loc"] > 40:
        out.append(_s("long_method", "medium", f"{name} is {m['loc']} lines long; consider extracting helpers.", start))
    if m["cyclomatic"] > 20:
        out.append(_s("high_complexity", "high", f"Cyclomatic complexity {m['cyclomatic']} (limit ~10).", start))
    elif m["cyclomatic"] > 10:
        out.append(_s("high_complexity", "medium", f"Cyclomatic complexity {m['cyclomatic']} (limit ~10).", start))
    if m["max_nesting"] >= 6:
        out.append(_s("deep_nesting", "high", f"Nesting depth {m['max_nesting']}; use early returns or extract blocks.", start))
    elif m["max_nesting"] >= 4:
        out.append(_s("deep_nesting", "medium", f"Nesting depth {m['max_nesting']}; flatten with guard clauses.", start))
    if m["params"] > 5:
        out.append(_s("long_parameter_list", "medium", f"{m['params']} parameters; group them into an object.", start))

    clean = blank(code, family)
    magic = [n for n in re.findall(r"(?<![\w.])\d+\.?\d*(?![\w.])", clean) if n not in ("0", "1", "2", "10", "100")]
    if len(magic) > 5:
        out.append(_s("magic_numbers", "low", f"{len(magic)} unexplained numeric literals; name them as constants.", start))

    empty = (re.search(r"except[^:\n]*:\s*\n\s*pass\b", clean) if family == "python"
             else re.search(r"catch\s*(?:\([^)]*\))?\s*\{\s*\}", clean))
    if empty:
        out.append(_s("empty_catch", "high", "Exception is swallowed silently; log or handle it.", start))
    if re.search(r"\bconsole\.log\(|\bprint\(", clean):
        out.append(_s("debug_output", "low", "Leftover debug output (print/console.log).", start))
    return out


def class_smells(src, family):
    out = []
    if family == "python":
        try:
            tree = ast.parse(src)
        except SyntaxError:
            return out
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                methods = sum(isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)) for n in node.body)
                size = node.end_lineno - node.lineno + 1
                if methods > 15 or size > 300:
                    out.append(_s("god_class", "high", f"Class {node.name} has {methods} methods / {size} lines; split responsibilities.", node.lineno))
        return out
    clean = blank(src, "brace")
    for m in re.finditer(r"(?:^|\n)[ \t]*(?:export\s+)?(?:default\s+)?(?:abstract\s+)?class\s+(?P<name>[\w$]+)[^{]*\{", clean):
        close = match_brace(clean, m.end() - 1)
        body = clean[m.end():close]
        methods = sum(1 for mm in _JS_PATTERNS[2].finditer(body) if mm.group("name") not in NOT_FUNCS)
        size = body.count("\n") + 1
        if methods > 15 or size > 300:
            line = clean.count("\n", 0, m.start("name")) + 1
            out.append(_s("god_class", "high", f"Class {m.group('name')} has {methods} methods / {size} lines; split responsibilities.", line))
    return out


WINDOW = 6


def find_duplicates(files):
    """files: list of (path, content, family). Returns {path: [smell, ...]} for repeated 6-line blocks."""
    seen = defaultdict(list)
    for path, content, family in files:
        lines = []
        for i, raw in enumerate(blank(content, family).splitlines(), 1):
            t = re.sub(r"\s+", " ", raw).strip()
            if len(t) > 3 and t not in ("{", "}", "});", "end"):
                lines.append((i, t))
        for k in range(len(lines) - WINDOW + 1):
            key = hashlib.md5("\n".join(t for _, t in lines[k:k + WINDOW]).encode()).hexdigest()
            seen[key].append((path, lines[k][0], k))
    dup_keys = {(p, k) for locs in seen.values() if len(locs) > 1 for p, _, k in locs}
    out = defaultdict(list)
    for locs in seen.values():
        if len(locs) < 2:
            continue
        for path, line, k in locs:
            if (path, k - 1) in dup_keys:
                continue  # merge consecutive windows into one report
            others = [f"{p}:{l}" for p, l, _ in locs if (p, l) != (path, line)][:3]
            if len(out[path]) < 10:
                out[path].append(_s("duplicate_code", "medium", f"Block repeated at {', '.join(others)}.", line))
    return out
