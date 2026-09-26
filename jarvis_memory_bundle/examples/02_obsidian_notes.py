#!/usr/bin/env python3
"""
Example 2: Sovereign Obsidian Vault Operations
Demonstrates creating structured markdown notes with YAML frontmatter,
reading notes, appending timestamped updates, and searching the vault.
"""

import sys
from pathlib import Path

# Add bundle root to path
bundle_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(bundle_root))

from brain_adapter.memory_adapter import memory_engine

def main():
    print("=" * 60)
    print("📓 OBSIDIAN VAULT OPERATIONS DEMO")
    print("=" * 60)

    # 1. Create a structured note in vault/knowledge/
    title = "Quantum Neural Mesh Architecture"
    body = (
        "The Quantum Neural Mesh acts as an asynchronous distributed reasoning graph.\n"
        "Nodes communicate via PipeWire zero-copy ring buffers and SQLite WAL event streams."
    )
    print(f"\n1. Creating note: '{title}'...")
    res_create = memory_engine.vault.create_note(title, body, folder="knowledge", tags=["architecture", "neural", "mesh"])
    print(f"   Created at: [[{res_create['path']}]] ({res_create['bytes']} bytes)")

    # 2. Append timestamped research findings to the note
    print(f"\n2. Appending update to [[{res_create['path']}]]...")
    res_append = memory_engine.vault.append_note(
        res_create['path'],
        "Benchmarks indicate 3.2ms latency across local IPC sockets. Zero GC pressure achieved."
    )
    print(f"   Status: {res_append['message']}")

    # 3. Read back the note with frontmatter parsing
    print(f"\n3. Reading note content and YAML frontmatter:")
    note = memory_engine.vault.read_note(res_create['path'])
    print(f"   Path: {note['path']}")
    print(f"   Frontmatter: {note['frontmatter']}")
    print(f"   Content snippet:\n{note['content'][:150]}...")

    # 4. Search the Obsidian vault
    print("\n4. Searching vault for 'Neural Mesh'...")
    search_hits = memory_engine.vault.search_vault("Neural Mesh", limit=5)
    for idx, hit in enumerate(search_hits, 1):
        print(f"   {idx}. [[{hit['path']}]] (score: {hit['score']}) -> {hit['preview'][:80]}...")

    print("\n✅ Obsidian vault operations demo completed successfully!")

if __name__ == "__main__":
    main()
