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
        else:
            res = {"error": f"Unknown command: {cmd}"}

        print(json.dumps(res))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
