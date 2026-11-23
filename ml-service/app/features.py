"""Static-analysis feature extraction for Python and brace-style languages (JS/TS/Java/Go/C...)."""
import ast
import math
import re

FEATURES = [
    "loc", "cyclomatic", "max_nesting", "params",
    "comment_ratio", "halstead_volume", "halstead_difficulty", "branches",
]

_PY_STRIP = re.compile(
    r"""#[^\n]*|"{3}[\s\S]*?"{3}|'{3}[\s\S]*?'{3}|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'"""
)
_BRACE_STRIP = re.compile(
    r"""//[^\n]*|/\*[\s\S]*?\*/|"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|`(?:\\.|[^`\\])*`"""
)

KEYWORDS = set(
    "if else elif for while do switch case break continue return try catch except finally throw raise "
    "def function class new import from export const let var async await yield lambda with as in is not "
    "and or typeof instanceof void delete public private protected static".split()
)
NOT_FUNCS = {"if", "for", "while", "switch", "catch", "function", "return", "else", "with", "do", "try"}


def blank(src: str, family: str) -> str:
    """Replace comments and strings with spaces (same length, newlines kept)."""
    rx = _PY_STRIP if family == "python" else _BRACE_STRIP
    return rx.sub(lambda m: re.sub(r"[^\n]", " ", m.group()), src)


def match_brace(clean: str, i: int) -> int:
    depth = 0
    for j in range(i, len(clean)):
        c = clean[j]
        if c == "{":
            depth += 1
        elif c == "}":
            depth -= 1
            if depth == 0:
                return j
    return len(clean) - 1


def _count_params(s: str) -> int:
    return len([p for p in (s or "").split(",") if p.strip()])


def python_units(src: str):
    try:
        tree = ast.parse(src)
    except SyntaxError:
        return None
    lines = src.splitlines()
    units = []
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
            a = node.args
            params = len(a.posonlyargs) + len(a.args) + len(a.kwonlyargs) + bool(a.vararg) + bool(a.kwarg)
            first = (a.posonlyargs + a.args)[:1]
            if first and first[0].arg in ("self", "cls"):
                params -= 1
            units.append({
                "name": node.name, "start": node.lineno, "end": node.end_lineno, "params": params,
                "code": "\n".join(lines[node.lineno - 1:node.end_lineno]),
            })
    return sorted(units, key=lambda u: u["start"])


_JS_PATTERNS = [
    re.compile(r"(?:^|\n)[ \t]*(?:export\s+)?(?:default\s+)?(?:async\s+)?function\s*\*?\s*(?P<name>[\w$]+)\s*\((?P<params>[^)]*)\)"),
    re.compile(
        r"(?:^|\n)[ \t]*(?:export\s+)?(?:const|let|var)\s+(?P<name>[\w$]+)\s*=\s*(?:async\s*)?"
        r"(?:function\s*[\w$]*\s*\((?P<params>[^)]*)\)|\((?P<params2>[^)]*)\)\s*(?::\s*[^=\n{]+)?=>|(?P<single>[\w$]+)\s*=>)"
    ),
    re.compile(
        r"(?:^|[\n{};])[ \t]*(?:public\s+|private\s+|protected\s+|static\s+|async\s+)*(?P<name>[\w$]+)\s*"
        r"\((?P<params>[^)]*)\)\s*(?::\s*[\w<>\[\]|., ]+)?\s*\{"
    ),
]
_BODY_GAP = re.compile(r"^[\s:\w<>\[\]|.,]*$")


def brace_units(src: str):
    clean = blank(src, "brace")
    units, seen = [], set()
    for idx, rx in enumerate(_JS_PATTERNS):
        for m in rx.finditer(clean):
            name = m.group("name")
            if name in NOT_FUNCS:
                continue
            start_pos = m.start("name")
            start_line = clean.count("\n", 0, start_pos) + 1
            if start_line in seen:
                continue
            gd = m.groupdict()
            params = _count_params(gd.get("params") or gd.get("params2") or gd.get("single"))
            line_start = clean.rfind("\n", 0, start_pos) + 1
            if idx == 2:
                open_i = m.end() - 1
            else:
                j = m.end()
                is_arrow = idx == 1 and "=>" in clean[m.start():m.end()]
                if is_arrow:
                    k = j
                    while k < len(clean) and clean[k] in " \t\r\n":
                        k += 1
                    if k < len(clean) and clean[k] == "{":
                        open_i = k
                    else:  # expression-bodied arrow
                        end_i = clean.find("\n", j)
                        end_i = len(clean) if end_i == -1 else end_i
                        seen.add(start_line)
                        units.append({"name": name, "start": start_line, "end": clean.count("\n", 0, end_i) + 1,
                                      "params": params, "code": src[line_start:end_i]})
                        continue
                else:
                    k = clean.find("{", j)
                    if k == -1 or not _BODY_GAP.match(clean[j:k]):
                        continue
                    open_i = k
            close_i = match_brace(clean, open_i)
            seen.add(start_line)
            units.append({
                "name": name, "start": start_line, "end": clean.count("\n", 0, close_i) + 1,
                "params": params, "code": src[line_start:close_i + 1],
            })
    return sorted(units, key=lambda u: u["start"])


def extract_units(src: str, family: str):
    units = python_units(src) if family == "python" else brace_units(src)
    if units:
        return units
    lines = src.splitlines()
    return [{"name": "<module>", "start": 1, "end": max(len(lines), 1), "params": 0, "code": src}]


def compute_metrics(code: str, family: str, params: int) -> dict:
    clean = blank(code, family)
    raw_lines = [l for l in code.splitlines() if l.strip()]
    loc = max(len(raw_lines), 1)
    comments = sum(1 for l in raw_lines if l.lstrip().startswith(("#", "//", "/*", "*")))

    if family == "python":
        decision = re.findall(r"\b(?:if|elif|for|while|except|and|or|case)\b", clean)
        lines = [l.expandtabs(4) for l in clean.splitlines() if l.strip()]
        indents = [len(l) - len(l.lstrip()) for l in lines]
        base = indents[0] if indents else 0
        diffs = sorted({i - base for i in indents if i > base})
        unit = diffs[0] if diffs else 4
        levels = max(((i - base) // unit for i in indents), default=0)
        nesting = max(levels - 1, 0)
    else:
        decision = re.findall(r"\b(?:if|for|while|case|catch)\b|&&|\|\||\?\?|\?(?![.?:])", clean)
        depth = best = 0
        for c in clean:
            if c == "{":
                depth += 1
                best = max(best, depth)
            elif c == "}":
                depth -= 1
        nesting = max(best - 1, 0)

    tokens = re.findall(r"[A-Za-z_$][\w$]*|\d+\.?\d*|[^\sA-Za-z0-9_$]", clean)
    ops = [t for t in tokens if t in KEYWORDS or not re.match(r"[\w$]", t)]
    opnds = [t for t in tokens if t not in KEYWORDS and re.match(r"[\w$]", t)]
    n1, n2, N1, N2 = len(set(ops)), len(set(opnds)), len(ops), len(opnds)
    volume = (N1 + N2) * math.log2(max(n1 + n2, 2))
    difficulty = (n1 / 2) * (N2 / max(n2, 1))
    cc = 1 + len(decision)
    return {
        "loc": loc, "cyclomatic": cc, "max_nesting": nesting, "params": params,
        "comment_ratio": round(comments / loc, 3), "halstead_volume": round(volume, 1),
        "halstead_difficulty": round(difficulty, 1), "branches": cc - 1,
    }


def to_row(metrics: dict):
    return [metrics[f] for f in FEATURES]
