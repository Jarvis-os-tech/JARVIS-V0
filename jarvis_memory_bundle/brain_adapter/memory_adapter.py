"""
Dual-Store Memory Engine Adapter for J.A.R.V.I.S.
Portable adapter connecting LLMs and agent loops to the memory bundle.

Components:
  - SQLite WAL persistent store (memory.db)
  - Sovereign Obsidian Markdown Vault (vault/)
  - Continuous Living Conversation capture (conversations/conversation.md)
  - Agent-scoped namespaces and rule miners
"""

import sys
import os
from pathlib import Path
from typing import List, Dict, Any, Optional

_bundle_root = Path(__file__).resolve().parent.parent
_python_pkg = _bundle_root / "python"

if str(_python_pkg) not in sys.path:
    sys.path.insert(0, str(_python_pkg))
if str(_bundle_root) not in sys.path:
    sys.path.insert(0, str(_bundle_root))

from python import JarvisMemory, MemoryNode


class DualStoreMemory:
    """
    Unified Dual-Store Memory wrapper.
    Provides single interface for:
      - Continuous living dialogue capture
      - Fact storage & retrieval
      - Obsidian note read / create / append / search
      - Dynamic system prompt memory injection
    """

    _instance = None

    @classmethod
    def get_instance(cls) -> "DualStoreMemory":
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self._jm = JarvisMemory.get_instance()
        self._cached_snapshot: Optional[Dict[str, Any]] = None

    @property
    def engine(self):
        return self._jm.engine

    @property
    def vault(self):
        return self._jm.vault

    @property
    def hermes(self):
        return self._jm.hermes

    @property
    def agents(self):
        return self._jm.agents

    @property
    def miner(self):
        return self._jm.miner

    @property
    def cognee(self):
        return getattr(self._jm, "cognee", None)

    # ─── Continuous Conversation ─────────────────────────────────────────

    def init_daily_session(self) -> str:
        """Initialize continuous and daily conversation logs."""
        return self._jm.vault.init_daily_session()

    def log_conversation_turn(self, speaker: str, text: str, role: str = "user") -> None:
        """Log a turn to both the continuous conversation and today's dated archive."""
        self._jm.log_turn(speaker, text, role=role)
        self._cached_snapshot = None

    def get_recent_conversation_turns(self, limit: int = 30) -> List[Dict[str, Any]]:
        """Fetch chronological turns from continuous conversation."""
        return self._jm.get_recent_conversation_turns(limit=limit)

    def get_continuous_transcript(self, max_turns: int = 25) -> str:
        """Read recent raw turns directly from conversations/conversation.md."""
        return self._jm.vault.get_continuous_transcript(max_turns=max_turns)

    def get_continuous_dialogue_summary(self, max_turns: int = 15) -> str:
        """Format recent continuous dialogue for prompt injection."""
        return self._jm.get_continuous_dialogue_summary(max_turns=max_turns)

    # ─── Fact Notes & Search ─────────────────────────────────────────────

    def save_memory_fact(self, key: str, value: str, category: str = "custom",
                         source: str = "user_added"):
        """Store fact to SQLite DB and write a Markdown note in vault/facts/."""
        node = MemoryNode(
            kind="fact",
            tier=2,
            content=f"{key}: {value}",
            importance=0.7,
            source=source,
        )
        self._jm.engine.store_node(node)
        self._jm.vault.save_fact(key, value, category=category, source=source)
        if hasattr(self._jm, "cognee") and self._jm.cognee and self._jm.cognee.is_available():
            self._jm.cognee.remember(f"{key}: {value}", metadata={"category": category, "source": source})
        self._cached_snapshot = None

    def search(self, query: str, limit: int = 8) -> List[Dict[str, Any]]:
        """Search across SQLite FTS5, Obsidian Vault files, and Cognee."""
        result = self._jm.search(query, limit=limit)
        return result.get("db", []) + result.get("vault", []) + result.get("cognee", [])

    # ─── System Prompt Context ───────────────────────────────────────────

    def get_context_for_prompt(self, agent_id: str = "jarvis-prime") -> str:
        """Build the full persistent context block for LLM system prompts."""
        return self._jm.get_context_for_prompt(agent_id=agent_id)

    def get_frozen_snapshot(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Cached snapshot of memory contents for telemetry / UI."""
        if self._cached_snapshot is not None and not force_refresh:
            return self._cached_snapshot

        self._cached_snapshot = {
            "user_content": self._jm.vault.get_user_profile(),
            "memory_content": self._jm.vault.get_memory(),
            "vault_facts": self._jm.vault.get_facts(),
            "formatted_prompt": self.get_context_for_prompt(),
            "timestamp": __import__("time").time(),
        }
        return self._cached_snapshot

    def get_vault_status(self) -> Dict[str, Any]:
        """Return operational telemetry on vault and DB."""
        return self._jm.status()


# Singleton export
memory_engine = DualStoreMemory.get_instance()
