#!/usr/bin/env python3
"""
J.A.R.V.I.S. Memory System CLI
Direct control interface for Continuous Living Memory, SQLite DB, and Sovereign Obsidian Vault.
"""

import sys
import os
import argparse
import json
from pathlib import Path

# Add current directory to path
_bundle_root = Path(__file__).resolve().parent
sys.path.insert(0, str(_bundle_root))

from brain_adapter.memory_adapter import memory_engine


def cmd_status(args):
    """Show memory engine and vault status."""
    st = memory_engine.get_vault_status()
    print("=" * 60)
    print("🧠 J.A.R.V.I.S. MEMORY SYSTEM STATUS")
    print("=" * 60)
    print(f"Vault Root      : {st.get('vault', {}).get('vault_root')}")
    print(f"Status          : {st.get('vault', {}).get('status', 'online')}")
    print(f"Today           : {st.get('vault', {}).get('today')}")
    print(f"Total Turns DB  : {st.get('engine', {}).get('total_turns', 0)}")
    print(f"Memory Nodes DB : {st.get('engine', {}).get('total_nodes', 0)}")
    print(f"Conversations   : {st.get('vault', {}).get('total_conversations', 0)} files")
    print(f"Execution Logs  : {st.get('vault', {}).get('total_execution_logs', 0)} files")
    print(f"Facts in Vault  : {st.get('vault', {}).get('total_facts', 0)} files")
    print("=" * 60)


def cmd_continuous(args):
    """View recent continuous conversation turns."""
    turns = memory_engine.get_recent_conversation_turns(limit=args.limit)
    print(f"🔄 CONTINUOUS LIVING DIALOGUE (Last {len(turns)} turns):")
    print("-" * 60)
    if not turns:
        print("No turns logged yet.")
    for t in turns:
        spk = t.get("speaker", "Unknown")
        txt = t.get("text", "")
        ts = t.get("timestamp", "")
        print(f"[{ts}] [{spk}]:\n  {txt}\n")


def cmd_search(args):
    """Search across SQLite FTS5, Obsidian Vault notes, and Knowledge Graph."""
    print(f"🔍 Searching memory for: '{args.query}'...")
    results = memory_engine.search(args.query, limit=args.limit)
    print(f"Found {len(results)} matches:\n")
    for idx, r in enumerate(results, 1):
        if "content" in r:
            print(f"{idx}. [DB - {r.get('kind', 'node')}] {r['content']}")
        elif "path" in r:
            print(f"{idx}. [Vault - [[{r['path']}]]] {r.get('preview', '')[:120]}...")
        else:
            print(f"{idx}. {r}")


def cmd_remember(args):
    """Store an atomic fact into memory."""
    memory_engine.save_memory_fact(args.key, args.value, category=args.category)
    print(f"✅ Stored fact '{args.key}': '{args.value}' (Category: {args.category})")
    print(f"   Written to SQLite DB and vault/facts/{args.key}.md")


def cmd_note(args):
    """Note subcommands: create, read, append."""
    action = args.note_action
    if action == "create":
        tags = [t.strip() for t in args.tags.split(",")] if args.tags else None
        res = memory_engine.vault.create_note(args.title, args.content, folder=args.folder, tags=tags)
        print(f"✅ Created note: [[{res['path']}]]")
        print(f"   Size: {res['bytes']} bytes")
    elif action == "read":
        res = memory_engine.vault.read_note(args.path)
        if res.get("success"):
            print(f"📄 Note: {res['path']}")
            if res.get("frontmatter"):
                print(f"Frontmatter: {json.dumps(res['frontmatter'], indent=2)}")
            print("-" * 40)
            print(res["content"])
        else:
            print(f"❌ Error: {res.get('error')}")
    elif action == "append":
        res = memory_engine.vault.append_note(args.path, args.content)
        if res.get("success"):
            print(f"✅ Appended to: {res['path']}")
        else:
            print(f"❌ Error: {res.get('error')}")


def cmd_prompt(args):
    """Display the continuous living context formatted for LLM system prompt."""
    prompt_ctx = memory_engine.get_context_for_prompt()
    print("=" * 60)
    print("🧩 INJECTED SYSTEM PROMPT MEMORY CONTEXT")
    print("=" * 60)
    print(prompt_ctx)


def cmd_turn(args):
    """Log a manual conversation turn."""
    memory_engine.log_conversation_turn(args.speaker, args.text, role=args.role)
    print(f"✅ Logged turn for [{args.speaker}]: '{args.text}'")


def main():
    parser = argparse.ArgumentParser(description="J.A.R.V.I.S. Memory System CLI")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # status
    p_status = subparsers.add_parser("status", help="Show memory and vault health")
    p_status.set_defaults(func=cmd_status)

    # continuous
    p_cont = subparsers.add_parser("continuous", help="View continuous living conversation history")
    p_cont.add_argument("--limit", type=int, default=20, help="Number of turns to show")
    p_cont.set_defaults(func=cmd_continuous)

    # search
    p_search = subparsers.add_parser("search", help="Search memory notes and database")
    p_search.add_argument("query", type=str, help="Search query")
    p_search.add_argument("--limit", type=int, default=8, help="Max results")
    p_search.set_defaults(func=cmd_search)

    # remember
    p_rem = subparsers.add_parser("remember", help="Store a factual memory")
    p_rem.add_argument("key", type=str, help="Fact key/title")
    p_rem.add_argument("value", type=str, help="Fact details/statement")
    p_rem.add_argument("--category", type=str, default="custom", help="Fact category")
    p_rem.set_defaults(func=cmd_remember)

    # note
    p_note = subparsers.add_parser("note", help="Manage Obsidian notes")
    note_sub = p_note.add_subparsers(dest="note_action", required=True)
    
    p_n_create = note_sub.add_parser("create", help="Create a new Obsidian note")
    p_n_create.add_argument("title", type=str, help="Note title")
    p_n_create.add_argument("content", type=str, help="Markdown body content")
    p_n_create.add_argument("--folder", type=str, default="knowledge", help="Vault subfolder")
    p_n_create.add_argument("--tags", type=str, default="", help="Comma-separated tags")

    p_n_read = note_sub.add_parser("read", help="Read an existing note")
    p_n_read.add_argument("path", type=str, help="Note relative path (e.g. knowledge/my_note.md)")

    p_n_append = note_sub.add_parser("append", help="Append content to a note")
    p_n_append.add_argument("path", type=str, help="Target note path")
    p_n_append.add_argument("content", type=str, help="Content to append")
    p_note.set_defaults(func=cmd_note)

    # prompt
    p_prompt = subparsers.add_parser("prompt", help="Display memory prompt context")
    p_prompt.set_defaults(func=cmd_prompt)

    # turn
    p_turn = subparsers.add_parser("turn", help="Append conversation turn")
    p_turn.add_argument("speaker", type=str, help="Speaker name (e.g. Gopi, Assistant)")
    p_turn.add_argument("text", type=str, help="Dialogue turn content")
    p_turn.add_argument("--role", type=str, default="user", choices=["user", "agent", "assistant", "system"])
    p_turn.set_defaults(func=cmd_turn)

    args = parser.parse_args()
    args.func(args)


if __name__ == "__main__":
    main()
