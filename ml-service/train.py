"""Train the bug-prone classifier.

  python train.py                          # bootstrap model on synthetic data
  python train.py --csv promise_cm1.csv    # NASA MDP / PROMISE style CSV (needs a 'defects' column)
  python train.py --csv mydata.csv         # or a CSV with our FEATURES columns + 'defective'
"""
import argparse
import json

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import f1_score, precision_score, recall_score, roc_auc_score
from sklearn.model_selection import train_test_split

from app.features import FEATURES
from app.model import heuristic_logit

PROMISE_MAP = {"loc": "loc", "v(g)": "cyclomatic", "v": "halstead_volume", "d": "halstead_difficulty",
               "branchCount": "branches", "defects": "defective"}


def synthetic(n=8000, seed=42):
    r = np.random.default_rng(seed)
    loc = np.clip(r.lognormal(3.3, 0.8, n), 3, 400).round()
    cc = 1 + r.poisson(loc / 12)
    X = pd.DataFrame({
        "loc": loc, "cyclomatic": cc, "max_nesting": np.minimum(8, r.poisson(cc / 4)),
        "params": r.poisson(2.2, n), "comment_ratio": r.beta(2, 10, n),
        "halstead_volume": loc * r.uniform(4, 9, n), "halstead_difficulty": r.uniform(3, 25, n) * (1 + cc / 20),
        "branches": cc - 1,
    })[FEATURES]
    p = 1 / (1 + np.exp(-heuristic_logit(X.values)))
    return X, (r.random(n) < p).astype(int)


def from_csv(path):
    df = pd.read_csv(path)
    df = df.rename(columns={k: v for k, v in PROMISE_MAP.items() if k in df.columns})
    if "lOComment" in df.columns and "loc" in df.columns:
        df["comment_ratio"] = df["lOComment"] / df["loc"].clip(lower=1)
    y = df["defective"].astype(str).str.lower().isin(["1", "true", "yes", "y"]).astype(int)
    if "cyclomatic" in df.columns:  # estimate features PROMISE does not have
        df.setdefault("max_nesting", np.sqrt(df["cyclomatic"]).round())
    df.setdefault("params", 2)
    for f in FEATURES:
        if f not in df.columns:
            df[f] = 0
    return df[FEATURES].apply(pd.to_numeric, errors="coerce").fillna(0), y


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("--csv")
    ap.add_argument("--out", default="model.pkl")
    a = ap.parse_args()
    X, y = from_csv(a.csv) if a.csv else synthetic()
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.25, stratify=y, random_state=1)
    clf = RandomForestClassifier(n_estimators=250, min_samples_leaf=3, class_weight="balanced_subsample",
                                 n_jobs=-1, random_state=1).fit(Xtr.values, ytr)
    pred, prob = clf.predict(Xte.values), clf.predict_proba(Xte.values)[:, 1]
    metrics = {"data": a.csv or "synthetic", "n": int(len(X)), "defect_rate": round(float(y.mean()), 3),
               "precision": round(precision_score(yte, pred), 3), "recall": round(recall_score(yte, pred), 3),
               "f1": round(f1_score(yte, pred), 3), "roc_auc": round(roc_auc_score(yte, prob), 3),
               "importances": dict(zip(FEATURES, map(lambda v: round(float(v), 3), clf.feature_importances_)))}
    joblib.dump(clf, a.out)
    json.dump(metrics, open("metrics.json", "w"), indent=2)
    print(json.dumps(metrics, indent=2))
