# 🛠️ J.A.R.V.I.S. Memory System Bundle — Audit & Hardening Blueprint

> **Target Package**: `/home/g0pi/Projects/Jarvis-OS/jarvis_memory_bundle`  
> **Status**: Comprehensive Engineering Audit & Actionable Fixes  
> **Date**: 2026-09-27  

---

## 📑 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Prioritized Action Matrix](#2-prioritized-action-matrix)
3. [Detailed Audit & Improvement Recipes](#3-detailed-audit--improvement-recipes)
   - [P0-1: Broken External Imports in Daily Summarizer](#p0-1-broken-external-imports-in-daily-summarizer)
   - [P0-2: Multi-Process SQLite Locking & Missing Timeout](#p0-2-multi-process-sqlite-locking--missing-timeout)
   - [P1-1: FTS5 Query Sanitization Breaks Natural Language Search](#p1-1-fts5-query-sanitization-breaks-natural-language-search)
   - [P1-2: Non-Atomic File Writes & Unsynchronized Appends](#p1-2-non-atomic-file-writes--unsynchronized-appends)
   - [P1-3: Continuous Conversation Scaling & Tail-Seeking](#p1-3-continuous-conversation-scaling--tail-seeking)
   - [P2-1: Unstructured MOC (`index.md`) Link Appending](#p2-1-unstructured-moc-indexmd-link-appending)
   - [P2-2: Cognee Bridge Offline Default & Silent Latency](#p2-2-cognee-bridge-offline-default--silent-latency)
4. [Verification & Test Checklist](#4-verification--test-checklist)

---

## 1. Executive Summary

The `jarvis_memory_bundle` is a powerful multi-tier memory system with:
- **Rust Engine** (`engine_rust/`): Highly performant (39/39 unit and integration tests passing, sub-50ms hybrid ranker).
- **Obsidian Vault** (`vault/`): Spec-compliant Zettelkasten structure with bidirectional wikilinks.
- **Continuous Living Memory**: Perpetual timeline architecture (`conversation.md` + SQLite `session_id='continuous'`).

However, during deep code review, **7 distinct edge cases and bugs** were identified on the Python and file-system integration layers that prevent it from being 100% rock-solid. This document outlines the exact locations, root causes, and recommended improvements.

---

## 2. Prioritized Action Matrix

| Priority | Category | Location | Issue Summary |
| :---: | :--- | :--- | :--- |
| **P0** | **Fatal Bug** | `python/summarizer.py:18-19` | Leaked `from brain...` imports cause `ModuleNotFoundError`, silently killing midnight summarization in `vault.py`. |
| **P0** | **Concurrency** | `python/engine.py:35-41` | Missing `timeout` and `PRAGMA busy_timeout` causes `sqlite3.OperationalError: database is locked` during concurrent Python/Rust access. |
| **P1** | **Search Quality** | `python/engine.py:14-19` | `_sanitize_fts5_query` mandates all words as strict prefix matches; natural language questions return 0 results if any stop-word is missing. |
| **P1** | **Data Integrity** | `python/vault.py:20-33` | Non-atomic file writes (`open(path, 'w')`) and unsynchronized appends risk truncated or interleaved files during crashes or multi-agent writes. |
| **P1** | **Performance** | `python/vault.py:127-142` | Whole-file reads of perpetual `conversation.md` will spike RAM and latency as dialogue grows into megabytes over months. |
| **P2** | **Obsidian MOC** | `python/vault.py:350-356` | New note links are naively appended to the bottom of `index.md` instead of categorizing under corresponding MOC section headers. |
| **P2** | **Configuration** | `python/cognee_bridge.py:46-52` | `COGNEE_ENABLED` defaults to `True` even without API keys, causing unnecessary remote network attempts. |

---

## 3. Detailed Audit & Improvement Recipes

---

### P0-1: Broken External Imports in Daily Summarizer

* **File**: `python/summarizer.py` (Lines 18–19)
* **Coupled Trigger**: `python/vault.py` (Lines 98–102)

#### The Problem
`summarizer.py` contains dangling imports from the outer Jarvis-OS system:
```python
# python/summarizer.py
from brain.logger import log_info, log_success, log_warn, log_error
from brain.providers import llm_manager
```
Because the standalone bundle does not include a `brain` package, importing `summarizer.py` crashes with:
```text
ModuleNotFoundError: No module named 'brain'
```
Furthermore, `vault.py` wraps the background summarizer trigger in a blind `except Exception: pass`, which silently swallows the error on every day-rollover:
```python
# python/vault.py
try:
    from .summarizer import conversation_summarizer
    conversation_summarizer.trigger_background_scan(exclude_today=True)
except Exception:
    pass  # Silently fails every time!
```

#### Recommended Improvement
1. Replace `from brain.logger` with the standard library `logging` module:
   ```python
   import logging
   logger = logging.getLogger("jarvis.summarizer")
   log_info = lambda msg, **kw: logger.info(msg)
   log_warn = lambda msg, **kw: logger.warning(msg)
   log_error = lambda msg, **kw: logger.error(msg)
   log_success = lambda msg, **kw: logger.info(f"SUCCESS: {msg}")
   ```
2. Replace `llm_manager` with a self-contained fallback using `google-genai` / `google.generativeai` or an HTTP request to Gemini/OpenAI using `os.environ.get("GEMINI_API_KEY")`.

---

### P0-2: Multi-Process SQLite Locking & Missing Timeout

* **File**: `python/engine.py` (Lines 35–41)

#### The Problem
The SQLite connection constructor does not specify a lock timeout:
```python
# python/engine.py
def _conn(self) -> sqlite3.Connection:
    conn = sqlite3.connect(self.db_path)
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.row_factory = sqlite3.Row
    return conn
```
When `engine_rust` (the compiled background daemon) or another Python thread is executing a write transaction in WAL mode, any new transaction in `engine.py` immediately fails with `sqlite3.OperationalError: database is locked` rather than waiting for the write lock to clear.

#### Recommended Improvement
Set an explicit `timeout` and SQLite `busy_timeout` pragma:
```python
def _conn(self) -> sqlite3.Connection:
    conn = sqlite3.connect(self.db_path, timeout=30.0)
    conn.execute("PRAGMA busy_timeout = 5000;")
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.row_factory = sqlite3.Row
    return conn
```

---

### P1-1: FTS5 Query Sanitization Breaks Natural Language Search

* **File**: `python/engine.py` (Lines 14–19)

#### The Problem
The sanitization function extracts all word characters and joins them with strict prefix match syntax:
```python
# python/engine.py
def _sanitize_fts5_query(query: str) -> str:
    tokens = re.findall(r'[\w]+', query)
    if not tokens:
        return ""
    return " ".join(f'"{t}"*' for t in tokens)
```
In SQLite FTS5, space acts as an implicit `AND`. If a user enters:
`"What did we discuss about the Ironclad deadline?"`
The query becomes:
`"What"* "did"* "we"* "discuss"* "about"* "the"* "Ironclad"* "deadline"*`
If even a single stop word (e.g., "did" or "about") is omitted from the stored text, FTS5 matches **nothing** (0 results).

#### Recommended Improvement
1. Filter out common English stop words before compiling prefix tokens.
2. Provide a fallback to `OR` matching or rank results using SQLite FTS5 `bm25()`:
```python
STOP_WORDS = {"what", "did", "we", "is", "a", "an", "the", "and", "or", "to", "of", "in", "for", "on", "with", "about"}

def _sanitize_fts5_query(query: str) -> str:
    all_tokens = re.findall(r'[\w]+', query)
    filtered = [t for t in all_tokens if t.lower() not in STOP_WORDS]
    tokens = filtered if filtered else all_tokens
    if not tokens:
        return ""
    # Use OR matching with prefix wildcard for flexible retrieval
    return " OR ".join(f'"{t}"*' for t in tokens)
```

---

### P1-2: Non-Atomic File Writes & Unsynchronized Appends

* **File**: `python/vault.py` (Lines 20–33)

#### The Problem
1. **Direct Truncation**:
   ```python
   # python/vault.py
   def _write_file(path: str, content: str):
       os.makedirs(os.path.dirname(path), exist_ok=True)
       with open(path, "w", encoding="utf-8") as f:
           f.write(content)
   ```
   If a crash, power outage, or OS kill signal occurs mid-write, the target Markdown note is left empty (0 bytes) or corrupted.
2. **Race Conditions on `conversation.md`**:
   Multiple background agents (or subagent tools) appending to the same daily log or `conversation.md` concurrently can interleave text chunks.

#### Recommended Improvement
1. **Atomic File Replacement**:
   ```python
   def _write_file(path: str, content: str):
       os.makedirs(os.path.dirname(path), exist_ok=True)
       tmp_path = f"{path}.tmp.{os.getpid()}_{time.time()}"
       with open(tmp_path, "w", encoding="utf-8") as f:
           f.write(content)
       os.replace(tmp_path, path)
   ```
2. **File Locking on Appends**:
   ```python
   import fcntl

   def _append_file(path: str, content: str):
       os.makedirs(os.path.dirname(path), exist_ok=True)
       with open(path, "a", encoding="utf-8") as f:
           fcntl.flock(f.fileno(), fcntl.LOCK_EX)
           try:
               f.write(content)
               f.flush()
           finally:
               fcntl.flock(f.fileno(), fcntl.LOCK_UN)
   ```

---

### P1-3: Continuous Conversation Scaling & Tail-Seeking

* **File**: `python/vault.py` (Lines 127–142) and `brain_adapter/memory_adapter.py`

#### The Problem
`vault/conversations/conversation.md` is an append-only file intended to record dialogue over weeks, months, and years.
Currently, loading recent context reads the **entire file** from disk into RAM:
```python
with open(conv_path, "r", encoding="utf-8") as f:
    content = f.read()  # Entire file loaded every single turn!
```
When this file reaches 10MB–50MB, this operation will cause noticeable latency spikes before every voice or LLM response.

#### Recommended Improvement
1. **Fast Reverse Seek**:
   Read only the last 64KB–128KB from the tail of the file when retrieving prompt context:
   ```python
   def read_continuous_tail(conv_path: str, max_bytes: int = 65536) -> str:
       if not os.path.exists(conv_path):
           return ""
       with open(conv_path, "rb") as f:
           f.seek(0, os.SEEK_END)
           size = f.tell()
           f.seek(max(0, size - max_bytes), os.SEEK_SET)
           raw = f.read()
           return raw.decode("utf-8", errors="ignore")
   ```
2. Alternatively, rely on the indexed SQLite `conversation_turns` table (`SELECT * FROM conversation_turns ORDER BY id DESC LIMIT 30`) for sub-millisecond turn hydration, leaving `conversation.md` strictly as a human-facing journal.

---

### P2-1: Unstructured MOC (`index.md`) Link Appending

* **File**: `python/vault.py` (Lines 350–356)

#### The Problem
When a note is created, `vault.py` appends the wikilink to the very bottom of `index.md`:
```python
if wikilink not in index_content:
    self._append_file(INDEX_MD, f"\n- {wikilink}")
```
Over time, `index.md` loses its structured sections (`## 📚 Knowledge`, `## 📌 Facts`, `## ⚡ Skills`), and turns into a flat dumping ground.

#### Recommended Improvement
Parse the target folder (e.g. `knowledge/`, `facts/`, `skills/`) and insert the `- [[...]]` under the matching Markdown section header in `index.md`.

---

### P2-2: Cognee Bridge Offline Default & Silent Latency

* **File**: `python/cognee_bridge.py` (Lines 46–52)

#### The Problem
`COGNEE_ENABLED` is initialized as:
```python
COGNEE_ENABLED = os.environ.get("COGNEE_ENABLED", "true").lower() in ("1", "true", "yes", "on")
```
It defaults to `True` pointing to `https://api.cognee.ai`, even if no `COGNEE_API_KEY` is present. During hybrid recall, it initiates external network requests that fail or time out.

#### Recommended Improvement
Set `COGNEE_ENABLED` to auto-disable unless valid credentials or a local MCP endpoint are detected:
```python
COGNEE_ENABLED = (
    os.environ.get("COGNEE_ENABLED", "false").lower() in ("1", "true", "yes", "on")
    and bool(os.environ.get("COGNEE_API_KEY") or os.environ.get("COGNEE_MCP_URL"))
)
```

---

## 4. Verification & Test Checklist

Once improvements are applied, execute this test suite to certify the bundle:

```bash
# 1. Verify Rust Engine Compilation & 39 Test Cases
cd /home/g0pi/Projects/Jarvis-OS/jarvis_memory_bundle/engine_rust
cargo test

# 2. Verify Python Module Imports (Ensure zero ModuleNotFoundError)
python3 -c "
import sys
sys.path.insert(0, '/home/g0pi/Projects/Jarvis-OS/jarvis_memory_bundle')
import python.engine
import python.vault
import python.summarizer
import brain_adapter.memory_adapter
print('All Python modules imported cleanly!')
"

# 3. Test Continuous Living Dialogue Logging & Retrieval
python3 /home/g0pi/Projects/Jarvis-OS/jarvis_memory_bundle/examples/01_continuous_dialogue.py

# 4. Test Note Creation, Frontmatter Parsing & MOC Linking
python3 /home/g0pi/Projects/Jarvis-OS/jarvis_memory_bundle/examples/02_obsidian_notes.py

# 5. Test Dual-Store FTS5 & Markdown Search
python3 /home/g0pi/Projects/Jarvis-OS/jarvis_memory_bundle/examples/03_dual_store_search.py

# 6. Verify CLI Operations
python3 /home/g0pi/Projects/Jarvis-OS/jarvis_memory_bundle/cli.py status
python3 /home/g0pi/Projects/Jarvis-OS/jarvis_memory_bundle/cli.py continuous --limit 10
```
