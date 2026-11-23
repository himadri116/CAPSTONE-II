import os

import joblib
import numpy as np

from .features import FEATURES

IDX = {f: i for i, f in enumerate(FEATURES)}


def heuristic_logit(X):
    """Hand-tuned prior used for bootstrap training data and as a fallback if no model.pkl exists."""
    X = np.asarray(X, float).reshape(-1, len(FEATURES))
    g = lambda n: X[:, IDX[n]]
    return (-4.2 + 0.018 * g("loc") + 0.11 * g("cyclomatic") + 0.28 * g("max_nesting") + 0.12 * g("params")
            - 4.0 * g("comment_ratio") + 0.0004 * g("halstead_volume") + 0.02 * g("halstead_difficulty"))


def level(p: float) -> str:
    return "high" if p >= 0.65 else "medium" if p >= 0.35 else "low"


class RiskModel:
    def __init__(self, path: str):
        self.clf = joblib.load(path) if os.path.exists(path) else None

    @property
    def name(self):
        return type(self.clf).__name__ if self.clf is not None else "heuristic-fallback"

    def predict(self, rows):
        X = np.asarray(rows, float).reshape(-1, len(FEATURES))
        if self.clf is not None:
            return self.clf.predict_proba(X)[:, 1]
        return 1 / (1 + np.exp(-heuristic_logit(X)))
