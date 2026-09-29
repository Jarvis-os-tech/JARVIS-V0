#!/usr/bin/env python3
"""
J.A.R.V.I.S. Dynamic Self-Improving Memory Bridge
Connects Express backend with jarvis_memory_bundle (SQLite + Obsidian Vault + Pattern Miner).
"""

import sys
import os
import json
from pathlib import Path

# Resolve paths
_cur_dir = Path(__file__).resolve().parent
_root_dir = _cur_dir.parent  # /home/g0pi/Downloads/jarvis
_bundle_dir = _root_dir / "jarvis_memory_bundle"

if str(_bundle_dir) not in sys.path:
    sys.path.insert(0, str(_bundle_dir))
if str(_bundle_dir / "python") not in sys.path:
    sys.path.insert(0, str(_bundle_dir / "python"))

from brain_adapter.memory_adapter import memory_engine
from python.types import ConversationTurn, MemoryNode


def handle_status():
    return memory_engine.get_vault_status()


def handle_context(agent_id="jarvis-prime"):
    return {"context": memory_engine.get_context_for_prompt(agent_id=agent_id)}


def handle_turns(limit=25):
    return {"turns": memory_engine.get_recent_conversation_turns(limit=limit)}


def handle_log_turn(speaker, text, role="user", other_speaker=None, other_text=None):
    # Log main turn
    memory_engine.log_conversation_turn(speaker, text, role=role)
    mined_facts = []

    # Dynamic Self-Improvement: Mine facts from the text
    miner = memory_engine.miner
    nodes = miner.extract_from_text(text, agent_id="jarvis")
    for node in nodes:
        memory_engine.engine.store_node(node)
        # If it's a fact or decision, also save to vault facts
        if node.kind in ("fact", "decision", "lesson"):
            clean_title = node.content[:40].replace(":", "-").replace("/", "-").strip()
            memory_engine.vault.save_fact(clean_title, node.content, category=node.kind, source="dynamic_miner")
            mined_facts.append({
                "id": node.id,
                "title": clean_title,
                "content": node.content,
                "kind": node.kind
            })

    # If an exchange pair is provided, mine both
    if other_text:
        memory_engine.log_conversation_turn(other_speaker or "JARVIS", other_text, role="assistant")
        assistant_nodes = miner.extract_from_text(other_text, agent_id="jarvis")
        for node in assistant_nodes:
            memory_engine.engine.store_node(node)
            if node.kind in ("fact", "decision", "lesson"):
                clean_title = node.content[:40].replace(":", "-").replace("/", "-").strip()
                memory_engine.vault.save_fact(clean_title, node.content, category=node.kind, source="dynamic_miner")
                mined_facts.append({
                    "id": node.id,
                    "title": clean_title,
                    "content": node.content,
                    "kind": node.kind
                })

    # Extract triples from the dialogue for knowledge graph
    combined_text = f"{text}\n{other_text or ''}".strip()
    triples = miner.extract_triples(combined_text, agent_id="jarvis")

    return {
        "status": "success",
        "mined_nodes": len(mined_facts),
        "extracted_facts": mined_facts,
        "triples_count": len(triples),
        "turns_logged": 2 if other_text else 1
    }


def handle_search(query, limit=10):
    results = memory_engine.search(query, limit=limit)
    return {"results": results}


def handle_save_fact(key, value, category="custom"):
    memory_engine.save_memory_fact(key, value, category=category, source="operator")
    return {"status": "saved", "key": key}


def get_db_connection():
    db_candidates = [
        os.environ.get("JARVIS_DB_PATH"),
        str(_root_dir / "data" / "jarvis.db"),
        str(_root_dir.parent / "JARVIS-V1" / "data" / "jarvis.db")
    ]
    for p in db_candidates:
        if p and os.path.exists(p):
            import sqlite3
            conn = sqlite3.connect(p)
            conn.row_factory = sqlite3.Row
            return conn
    # Fallback to local data dir
    local_path = _root_dir / "data" / "jarvis.db"
    local_path.parent.mkdir(parents=True, exist_ok=True)
    import sqlite3
    conn = sqlite3.connect(str(local_path))
    conn.row_factory = sqlite3.Row
    return conn


def _get_vault_file(category: str):
    v1_mem = _root_dir.parent / "JARVIS-V1" / "JARVIS-MEMORY" / "Memory"
    if category in ("personal_data", "personalDetails", "personal_details"):
        p = v1_mem / "Personal Details Memory" / "Personal Details.md"
    elif category == "preferences":
        p = v1_mem / "User Preference Memory" / "Preferences.md"
    elif category == "instructions":
        p = v1_mem / "Instruction Memory" / "Instructions.md"
    else:
        p = None
    if p and p.exists():
        return p
    return None


def _sync_vault_file_add(category: str, content: str, learned_date: str):
    vf = _get_vault_file(category)
    if not vf:
        return
    try:
        text = vf.read_text(encoding="utf-8")
        entry = f"- {content} (Learned: {learned_date})\n"
        if entry not in text:
            vf.write_text(text + "\n" + entry, encoding="utf-8")
    except Exception as e:
        sys.stderr.write(f"[VaultSync] Failed to append: {e}\n")


def _sync_vault_file_remove(category: str, content: str):
    vf = _get_vault_file(category)
    if not vf:
        return
    try:
        lines = vf.read_text(encoding="utf-8").splitlines()
        clean_target = content.lower().strip()
        new_lines = [l for l in lines if clean_target not in l.lower()]
        vf.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    except Exception as e:
        sys.stderr.write(f"[VaultSync] Failed to remove: {e}\n")


def _sync_vault_file_rewrite(category: str, old_content: str, new_content: str):
    vf = _get_vault_file(category)
    if not vf:
        return
    try:
        lines = vf.read_text(encoding="utf-8").splitlines()
        clean_old = old_content.lower().strip()
        replaced = False
        new_lines = []
        for line in lines:
            if clean_old in line.lower() and not replaced:
                # Replace with new content format
                new_lines.append(f"- {new_content}")
                replaced = True
            else:
                new_lines.append(line)
        if not replaced:
            new_lines.append(f"- {new_content}")
        vf.write_text("\n".join(new_lines) + "\n", encoding="utf-8")
    except Exception as e:
        sys.stderr.write(f"[VaultSync] Failed to rewrite: {e}\n")


TABLE_MAP = {
    "personal_data": "personal_details",
    "personalDetails": "personal_details",
    "personal_details": "personal_details",
    "preferences": "preferences",
    "instructions": "instructions"
}


def handle_get_triad(category=None):
    conn = get_db_connection()
    c = conn.cursor()

    def fetch_cat(cat_key, tbl):
        try:
            c.execute(f"SELECT id, content, learned_date FROM {tbl} ORDER BY id ASC")
            rows = c.fetchall()
            return [
                {
                    "id": str(r["id"]),
                    "category": cat_key,
                    "content": r["content"],
                    "learnedDate": r["learned_date"] or ""
                }
                for r in rows
            ]
        except Exception:
            return []

    if category and category != "all":
        tbl = TABLE_MAP.get(category, category)
        items = fetch_cat(category, tbl)
        conn.close()
        return items

    res = {
        "personal_data": fetch_cat("personal_data", "personal_details"),
        "preferences": fetch_cat("preferences", "preferences"),
        "instructions": fetch_cat("instructions", "instructions")
    }
    conn.close()
    return res


def handle_add_triad(category: str, content: str, learned_date: str = None):
    tbl = TABLE_MAP.get(category, "personal_details")
    if not learned_date:
        import datetime
        learned_date = f"[[{datetime.date.today().isoformat()}]]"

    conn = get_db_connection()
    c = conn.cursor()
    c.execute(
        f"INSERT OR REPLACE INTO {tbl} (content, learned_date) VALUES (?, ?)",
        (content.strip(), learned_date)
    )
    conn.commit()
    new_id = c.lastrowid
    conn.close()

    _sync_vault_file_add(category, content, learned_date)

    return {
        "status": "added",
        "id": str(new_id),
        "category": category,
        "content": content,
        "learnedDate": learned_date
    }


def handle_remove_triad(category: str, content_or_id: str):
    tbl = TABLE_MAP.get(category, "personal_details")
    conn = get_db_connection()
    c = conn.cursor()

    deleted = 0
    # Try as integer ID first
    if str(content_or_id).isdigit():
        c.execute(f"DELETE FROM {tbl} WHERE id = ?", (int(content_or_id),))
        deleted = c.rowcount
    else:
        # Match exact content
        c.execute(f"DELETE FROM {tbl} WHERE LOWER(TRIM(content)) = LOWER(TRIM(?))", (content_or_id,))
        deleted = c.rowcount
        if deleted == 0:
            # Substring match
            c.execute(f"DELETE FROM {tbl} WHERE content LIKE ?", (f"%{content_or_id.strip()}%",))
            deleted = c.rowcount

    conn.commit()
    conn.close()

    _sync_vault_file_remove(category, str(content_or_id))

    return {
        "status": "removed" if deleted > 0 else "not_found",
        "category": category,
        "deletedCount": deleted
    }


def handle_rewrite_triad(category: str, old_content_or_id: str, new_content: str):
    tbl = TABLE_MAP.get(category, "personal_details")
    conn = get_db_connection()
    c = conn.cursor()

    updated = 0
    if str(old_content_or_id).isdigit():
        c.execute(f"UPDATE {tbl} SET content = ? WHERE id = ?", (new_content.strip(), int(old_content_or_id)))
        updated = c.rowcount
    else:
        c.execute(f"UPDATE {tbl} SET content = ? WHERE LOWER(TRIM(content)) = LOWER(TRIM(?))", (new_content.strip(), old_content_or_id))
        updated = c.rowcount
        if updated == 0:
            c.execute(f"SELECT id FROM {tbl} WHERE content LIKE ? LIMIT 1", (f"%{old_content_or_id.strip()}%",))
            row = c.fetchone()
            if row:
                c.execute(f"UPDATE {tbl} SET content = ? WHERE id = ?", (new_content.strip(), row["id"]))
                updated = c.rowcount

    if updated == 0:
        # If not found to update, insert as new
        import datetime
        date_str = f"[[{datetime.date.today().isoformat()}]]"
        c.execute(f"INSERT OR REPLACE INTO {tbl} (content, learned_date) VALUES (?, ?)", (new_content.strip(), date_str))
        updated = 1

    conn.commit()
    conn.close()

    _sync_vault_file_rewrite(category, str(old_content_or_id), new_content)

    return {
        "status": "rewritten",
        "category": category,
        "newContent": new_content,
        "updatedCount": updated
    }


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No command provided"}))
        sys.exit(1)

    cmd = sys.argv[1]

    try:
        if cmd == "status":
            res = handle_status()
        elif cmd == "context":
            agent_id = sys.argv[2] if len(sys.argv) > 2 else "jarvis-prime"
            res = handle_context(agent_id)
        elif cmd == "turns":
            limit = int(sys.argv[2]) if len(sys.argv) > 2 else 25
            res = handle_turns(limit)
        elif cmd == "log_turn":
            payload = json.loads(sys.argv[2]) if len(sys.argv) > 2 else {}
            res = handle_log_turn(
                speaker=payload.get("speaker", "User (Gopi)"),
                text=payload.get("text", ""),
                role=payload.get("role", "user"),
                other_speaker=payload.get("other_speaker"),
                other_text=payload.get("other_text")
            )
        elif cmd == "search":
            query = sys.argv[2] if len(sys.argv) > 2 else ""
            limit = int(sys.argv[3]) if len(sys.argv) > 3 else 10
            res = handle_search(query, limit)
        elif cmd == "save_fact":
            key = sys.argv[2]
            val = sys.argv[3]
            cat = sys.argv[4] if len(sys.argv) > 4 else "custom"
            res = handle_save_fact(key, val, cat)
        elif cmd == "get_triad":
            category = sys.argv[2] if len(sys.argv) > 2 else None
            res = handle_get_triad(category)
        elif cmd == "add_triad":
            category = sys.argv[2]
            content = sys.argv[3]
            date = sys.argv[4] if len(sys.argv) > 4 else None
            res = handle_add_triad(category, content, date)
        elif cmd == "remove_triad":
            category = sys.argv[2]
            content_or_id = sys.argv[3]
            res = handle_remove_triad(category, content_or_id)
        elif cmd == "rewrite_triad":
            category = sys.argv[2]
            old_content = sys.argv[3]
            new_content = sys.argv[4]
            res = handle_rewrite_triad(category, old_content, new_content)
        else:
            res = {"error": f"Unknown command: {cmd}"}

        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
