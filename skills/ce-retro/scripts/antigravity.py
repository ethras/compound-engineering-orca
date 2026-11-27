"""Read Antigravity's local workspace index and exported JSONL transcripts."""
import json
import os
import sqlite3
import time
from contextlib import closing
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urlsplit
from urllib.request import url2pathname


def workspace_path(value):
    if not isinstance(value, str) or not value:
        return None
    if value.startswith("file:"):
        try:
            uri = urlsplit(value)
        except ValueError:
            return None
        if uri.netloc not in ("", "localhost"):
            return None
        value = url2pathname(uri.path)
    return os.path.realpath(value) if os.path.isabs(value) and "\x00" not in value else None


def workspaces(store, candidates, warnings):
    """Only consult CLI history for sessions the summary index could not place."""
    by_id, parents = {}, {}
    db = store / "conversation_summaries.db"
    if db.is_file():
        try:
            with closing(sqlite3.connect(db.as_uri() + "?mode=ro", uri=True)) as conn:
                for sid, uris, parent in conn.execute(
                    "SELECT conversation_id, workspace_uris, parent_conversation_id FROM conversation_summaries"
                ):
                    if sid in candidates:
                        parents[sid] = parent
                        if uris:
                            try:
                                values = json.loads(uris)
                            except ValueError:
                                continue
                            if isinstance(values, list) and values:
                                by_id[sid] = values
        except sqlite3.Error as exc:
            warnings.append(f"Antigravity: could not read {db.name} in {store.name}: {exc}")
    missing = candidates - by_id.keys()
    history = store / "history.jsonl"
    if missing and history.is_file():
        with history.open(encoding="utf-8", errors="replace") as stream:
            for line in stream:
                try:
                    event = json.loads(line)
                except ValueError:
                    continue
                if isinstance(event, dict):
                    sid, cwd = event.get("conversationId"), event.get("workspace")
                    if isinstance(sid, str) and sid in missing and isinstance(cwd, str) and cwd:
                        by_id.setdefault(sid, set()).add(cwd)
    return by_id, parents


def discover(roots, days, warnings, files, totals):
    cutoff = time.time() - days * 86400
    rows = {}
    home = Path.home()
    profiles = [(home / ".gemini" / name, None)
                for name in ("antigravity-cli", "antigravity", "antigravity-ide")]
    t3 = home / ".t3" / "userdata"
    attachments = os.path.realpath(t3 / "attachments")
    profiles.extend((store, attachments)
                    for store in (t3 / "providers" / "antigravity").glob("*/antigravity-acp"))
    for store, attachment_dir in profiles:
        if not store.is_dir():
            continue
        name = str(store.relative_to(home))
        candidates = {}
        try:
            binary_only = {f.stem for f in (store / "conversations").glob("*")
                           if f.suffix in (".db", ".pb") and f.stat().st_mtime >= cutoff}
            for logs in (store / "brain").glob("*/.system_generated/logs"):
                for filename in ("transcript.jsonl", "transcript_full.jsonl"):
                    file = logs / filename
                    if file.is_file() and file.resolve() == store.resolve() / file.relative_to(store):
                        stat = file.stat()
                        if stat.st_mtime >= cutoff and stat.st_size:
                            candidates[logs.parents[1].name] = (file, stat)
                            break
            files.extend(str(file) for file, _ in candidates.values())
            totals["files_processed"] += len(candidates)
            binary_only.difference_update(candidates)
            by_id, parents = workspaces(store, candidates.keys() | binary_only, warnings)
        except OSError as exc:
            warnings.append(f"Antigravity: could not read {name}: {exc}")
            continue
        unknown = len(candidates.keys() - by_id.keys())
        totals["files_without_metadata"] += unknown
        if unknown:
            warnings.append(f"Antigravity: {unknown} recent transcript(s) in {name} have no recorded workspace")
        unavailable = 0
        for sid, values in by_id.items():
            paths = [workspace_path(v) for v in values]
            if attachment_dir is not None:
                # T3 mounts this directory for attachments alongside the actual workspace.
                paths = [p for p in paths if p != attachment_dir]
            if not paths or not all(p and any(Path(p).is_relative_to(root) for root in roots) for p in paths):
                totals["filtered_by_cwd"] += int(sid in candidates)
                continue
            if sid not in candidates:
                unavailable += 1
                continue
            file, stat = candidates[sid]
            last = datetime.fromtimestamp(stat.st_mtime, timezone.utc).isoformat().replace("+00:00", "Z")
            if sid not in rows or last > rows[sid]["last_ts"]:
                rows[sid] = dict(session=sid, platform="antigravity", file=str(file), cwd=paths[0],
                                 size=stat.st_size, last_ts=last, parent_session=parents.get(sid))
        if unavailable:
            warnings.append(f"Antigravity: {unavailable} session(s) in {name} match this repo but have no recent JSONL transcript")
        unknown_binary = len(binary_only - by_id.keys())
        if unknown_binary:
            warnings.append(f"Antigravity: {unknown_binary} recent binary session(s) in {name} have no recorded workspace")
    for row in rows.values():
        if row["parent_session"] not in rows:
            del row["parent_session"]
    return list(rows.values())


def is_transcript(source):
    path = Path(source)
    return (path.name in ("transcript.jsonl", "transcript_full.jsonl")
            and len(path.parts) >= 5 and path.parts[-5] == "brain"
            and path.parts[-3:-1] == (".system_generated", "logs"))


def extract(script, source, dest):
    """Read only a selected transcript. Never include model thinking or full tool output."""
    source = Path(source)
    sid = source.parents[2].name
    # All sessions use the same transcript basename, including siblings.
    dest = Path(dest).with_name(sid + "." + Path(dest).name)
    errors_only = script == "extract-errors.py"
    stats = {"user": 0, "assistant": 0, "tool": 0}
    try:
        with source.open(encoding="utf-8", errors="replace") as stream, dest.open("w", encoding="utf-8") as out:
            for line in stream:
                try:
                    step = json.loads(line)
                except ValueError:
                    stats["warning"] = "invalid JSONL step"
                    continue
                if not isinstance(step, dict):
                    continue
                kind, status = step.get("type"), step.get("status")
                content = step.get("content")
                content = content if isinstance(content, str) else ""
                stamp = step.get("created_at", "")
                if errors_only:
                    if status in ("ERROR", "FAILED") or kind == "ERROR_MESSAGE":
                        print(f"[{stamp}] [error] {kind}: {content[:400]}", file=out)
                elif kind in ("USER_INPUT", "PLANNER_RESPONSE"):
                    role = "user" if kind == "USER_INPUT" else "assistant"
                    if content:
                        print(f"[{stamp}] [{role}] {content[:800]}", file=out)
                        stats[role] += 1
                    calls = step.get("tool_calls", [])
                    if not isinstance(calls, list):
                        stats["warning"] = "unrecognized tool calls"
                        continue
                    for call in calls:
                        if isinstance(call, dict) and isinstance(call.get("name"), str):
                            args = call.get("args")
                            detail = args.get("toolSummary", "") if isinstance(args, dict) else ""
                            print(f"[{stamp}] [tool] {call['name']} {str(detail)[:200]}", file=out)
                            stats["tool"] += 1
        stats["bytes"] = dest.stat().st_size
        return True, stats
    except OSError:
        return False, {}
