"""
Obsidian & Memory Actuator Tool Handlers.
Ready-to-use dispatch handlers for any agent, function calling, or MCP tool router.
"""

from typing import Dict, Any, List, Optional
from .memory_adapter import memory_engine


def handle_obsidian_search(query: str, limit: int = 10) -> Dict[str, Any]:
    """Search Markdown notes in the Obsidian vault."""
    results = memory_engine.vault.search_vault(query, limit=limit)
    return {
        "success": True,
        "query": query,
        "count": len(results),
        "results": results,
    }


def handle_obsidian_read(path: str) -> Dict[str, Any]:
    """Read full content and frontmatter of an Obsidian note."""
    return memory_engine.vault.read_note(path)


def handle_obsidian_create(title: str, content: str, folder: str = "knowledge",
                           tags: Optional[List[str]] = None) -> Dict[str, Any]:
    """Create a new Markdown note in the Obsidian vault with frontmatter."""
    return memory_engine.vault.create_note(title, content, folder=folder, tags=tags)


def handle_obsidian_append(path: str, content: str) -> Dict[str, Any]:
    """Append timestamped content to an existing Obsidian note."""
    return memory_engine.vault.append_note(path, content)


def handle_jarvis_remember(key: str, value: str, category: str = "custom") -> Dict[str, Any]:
    """Store an atomic fact in both SQLite database and Obsidian vault."""
    memory_engine.save_memory_fact(key, value, category=category)
    return {
        "success": True,
        "message": f"Stored fact '{key}' in long-term memory.",
    }


def handle_jarvis_recall(query: str, limit: int = 10) -> Dict[str, Any]:
    """Hybrid search across SQLite FTS5, Obsidian Vault files, and Knowledge Graph."""
    results = memory_engine.search(query, limit=limit)
    return {
        "success": True,
        "query": query,
        "results": results,
    }


def handle_jarvis_vault_status() -> Dict[str, Any]:
    """Return status and health metrics for the vault and database."""
    return {
        "success": True,
        "status": memory_engine.get_vault_status(),
    }
