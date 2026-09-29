"""
JARVIS Memory System — Hermes Memory Bridge.
Read-only synchronization and inspection of Hermes long-term memories.
Parses ~/.hermes/memories/MEMORY.md and USER.md (§-delimited entries).
"""

import os
import hashlib
from typing import List, Dict, Any, Optional

try:
    from .config import DEFAULT_CONFIG, HermesConfig
except (ImportError, ValueError):
    from config import DEFAULT_CONFIG, HermesConfig


class HermesMemoryBridge:
    """
    Read-only bridge from Hermes long-term memories into JARVIS memory ecosystem.

    Hermes stores memories as §-delimited markdown blocks in:
      - ~/.hermes/memories/MEMORY.md (system knowledge & learned facts)
      - ~/.hermes/memories/USER.md   (operator profile & preferences)
    """

    def __init__(self, memory_engine: Optional[Any] = None, config: Optional[HermesConfig] = None):
        self.config = config or DEFAULT_CONFIG
        self.engine = memory_engine
        self.memories_dir = self.config.memories_dir
        self.memory_path = os.path.join(self.memories_dir, "MEMORY.md")
        self.user_path = os.path.join(self.memories_dir, "USER.md")

    # ─── Public API ──────────────────────────────────────────────────────────

    def get_hermes_status(self) -> Dict[str, Any]:
        """Check Hermes memory availability, file sizes, and entry counts."""
        hermes_home_exists = os.path.exists(self.config.hermes_home)
        mem_exists = os.path.exists(self.memory_path)
        user_exists = os.path.exists(self.user_path)

        return {
            "hermes_home": self.config.hermes_home,
            "hermes_available": hermes_home_exists,
            "memories_dir": self.memories_dir,
            "memory_md_exists": mem_exists,
            "user_md_exists": user_exists,
            "memory_md_size": os.path.getsize(self.memory_path) if mem_exists else 0,
            "user_md_size": os.path.getsize(self.user_path) if user_exists else 0,
            "memory_entries_count": len(self.parse_memory_file(self.memory_path)),
            "user_entries_count": len(self.parse_memory_file(self.user_path)),
        }

    def read_all_memories(self) -> Dict[str, List[Dict[str, Any]]]:
        """
        Read and parse all Hermes entries into structured dictionaries.
        """
        memory_blocks = self.parse_memory_file(self.memory_path)
        user_blocks = self.parse_memory_file(self.user_path)

        facts = [
            {
                "id": f"hermes_{self._hash(text)}",
                "kind": "fact",
                "source": "MEMORY.md",
                "content": text,
                "summary": text[:200] if len(text) > 200 else text,
                "hash": self._hash(text),
            }
            for text in memory_blocks
        ]

        entities = [
            {
                "id": f"hermes_{self._hash(text)}",
                "kind": "entity",
                "source": "USER.md",
                "content": text,
                "summary": text[:200] if len(text) > 200 else text,
                "hash": self._hash(text),
            }
            for text in user_blocks
        ]

        return {
            "facts": facts,
            "entities": entities,
            "total": len(facts) + len(entities),
        }

    def sync(self) -> Dict[str, int]:
        """
        Import new Hermes memory blocks into the attached JARVIS MemoryEngine.
        Returns: counts {"imported": N, "skipped": M, "total": T}
        """
        if not self.engine:
            data = self.read_all_memories()
            return {"imported": 0, "skipped": 0, "total": data["total"], "note": "No active MemoryEngine attached"}

        imported = 0
        skipped = 0

        memory_entries = self.parse_memory_file(self.memory_path)
        for entry in memory_entries:
            if self._import_node(entry, kind="fact", source_file="MEMORY.md"):
                imported += 1
            else:
                skipped += 1

        user_entries = self.parse_memory_file(self.user_path)
        for entry in user_entries:
            if self._import_node(entry, kind="entity", source_file="USER.md"):
                imported += 1
            else:
                skipped += 1

        total = len(memory_entries) + len(user_entries)
        return {"imported": imported, "skipped": skipped, "total": total}

    def get_raw_memory(self) -> str:
        """Read raw content of MEMORY.md."""
        return self._read_file(self.memory_path)

    def get_raw_user(self) -> str:
        """Read raw content of USER.md."""
        return self._read_file(self.user_path)

    # ─── Parsing & Utilities ─────────────────────────────────────────────────

    def parse_memory_file(self, path: str) -> List[str]:
        """
        Parse a Hermes memory file into individual entries.
        Hermes uses '§' as a delimiter between memory blocks.
        """
        content = self._read_file(path)
        if not content:
            return []

        blocks = content.split("§")
        entries = []
        for block in blocks:
            text = block.strip()
            if text and len(text) > 10:  # Skip tiny whitespace fragments
                entries.append(text)
        return entries

    def _import_node(self, text: str, kind: str, source_file: str) -> bool:
        """Import single entry into memory engine with SHA-256 deduplication."""
        content_hash = self._hash(text)
        node_id = f"hermes_{content_hash}"

        # Check if engine supports hash checking
        if hasattr(self.engine, "node_exists_by_hash") and self.engine.node_exists_by_hash(node_id):
            return False

        # Attempt engine storage
        try:
            if hasattr(self.engine, "store_node"):
                from memory.python.types import MemoryNode
                node = MemoryNode(
                    id=node_id,
                    kind=kind,
                    tier=3,  # Permanent knowledge tier
                    content=text,
                    summary=text[:200] if len(text) > 200 else None,
                    importance=0.8,
                    agent_id="hermes",
                    source="hermes",
                    metadata_json=f'{{"source_file": "{source_file}"}}',
                )
                self.engine.store_node(node)
                return True
        except Exception:
            pass

        return False

    @staticmethod
    def _hash(text: str) -> str:
        """SHA-256 hash prefix for deduplication."""
        return hashlib.sha256(text.strip().encode("utf-8")).hexdigest()[:16]

    @staticmethod
    def _read_file(path: str) -> str:
        if not os.path.exists(path):
            return ""
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception:
            return ""
