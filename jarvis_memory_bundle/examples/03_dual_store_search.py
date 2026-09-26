#!/usr/bin/env python3
"""
Example 3: Dual-Store & Multi-Tier Search
Demonstrates storing facts simultaneously into SQLite WAL and Obsidian Vault,
and querying across both stores seamlessly.
"""

import sys
from pathlib import Path

# Add bundle root to path
bundle_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(bundle_root))

from brain_adapter.memory_adapter import memory_engine

def main():
    print("=" * 60)
    print("🔍 DUAL-STORE MULTI-TIER SEARCH DEMO")
    print("=" * 60)

    # 1. Save factual memory to dual store
    key = "Favorite Language"
    value = "Python 3.12+ for AI core and Rust for zero-GC audio & memory."
    print(f"\n1. Storing fact: '{key}' -> '{value}'...")
    memory_engine.save_memory_fact(key, value, category="preferences", source="demo_script")
    print("   Fact stored in both SQLite WAL and vault/facts/Favorite_Language.md")

    # 2. Query dual store
    query = "Python 3.12"
    print(f"\n2. Executing multi-store search for query: '{query}'...")
    results = memory_engine.search(query, limit=5)
    print(f"   Found {len(results)} matches across all stores:")
    for idx, r in enumerate(results, 1):
        if "content" in r:
            print(f"   {idx}. [SQLite FTS5 - {r.get('kind', 'fact')}] {r['content']}")
        elif "path" in r:
            print(f"   {idx}. [Obsidian Vault - [[{r['path']}]]] {r.get('preview', '')[:100]}...")
        else:
            print(f"   {idx}. {r}")

    # 3. Inspect system prompt full context
    print("\n3. Full System Prompt Context block:")
    full_prompt = memory_engine.get_context_for_prompt()
    print("-" * 40)
    print(full_prompt[:500] + "\n... [truncated] ...")

    print("\n✅ Dual-store search demo completed successfully!")

if __name__ == "__main__":
    main()
