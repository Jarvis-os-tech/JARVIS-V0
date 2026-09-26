# 🧠 J.A.R.V.I.S. Memory System Bundle

A standalone, portable, sovereign memory package for AI assistants featuring:
- **Continuous Living Memory** (`conversations/conversation.md` + perpetual session timeline)
- **Sovereign Obsidian Vault** (`vault/` with full `.obsidian` configurations, wikilinks, and frontmatter)
- **SQLite WAL Database** (`vault/memory.db` with FTS5 search)
- **High-Performance Rust Memory Engine** (`engine_rust/` on port 50051)
- **Full-featured CLI** (`cli.py`)
- **Ready-to-use Brain Adapter & Actuators** (`brain_adapter/`)
- **Executable Examples** (`examples/`)

---

## 🚀 30-Second Quickstart

```bash
# 1. View memory system health
python3 cli.py status

# 2. View perpetual continuous conversation
python3 cli.py continuous --limit 10

# 3. Create a note in your Obsidian vault
python3 cli.py note create "Neural Gateway" "PipeWire zero-GC audio buffers." --folder "knowledge"

# 4. Search across both SQLite and Obsidian
python3 cli.py search "neural"

# 5. Run the 3 standalone demonstration examples
python3 examples/01_continuous_dialogue.py
python3 examples/02_obsidian_notes.py
python3 examples/03_dual_store_search.py
```

---

## 📁 Bundle Directory Structure

```
jarvis_memory_bundle/
├── GUIDE.md                      # 📖 Comprehensive Master Architectural & Developer Guide
├── README.md                     # ⚡ Fast Reference & Quickstart
├── cli.py                        # 🛠️ Command-Line Interface for all memory operations
├── python/                       # 🐍 Python Memory Core (engine, vault manager, summarizer)
├── vault/                        # 📓 Sovereign Obsidian Vault (Open directly in Obsidian app)
├── engine_rust/                  # 🦀 Rust Memory Engine Core (Tokio, Axum, port 50051)
├── brain_adapter/                # 🔌 Plug-and-play adapter for any AI agent / LLM
└── examples/                     # 🧪 Standalone executable test & demonstration scripts
```

---

## 📓 Open in Obsidian App

1. Open the [Obsidian](https://obsidian.md) app on your computer or phone.
2. Click **"Open folder as vault"**.
3. Select the `vault/` folder inside this directory.
4. Enjoy your interactive graph view, daily conversation journals, atomic facts, and bidirectional links!

---

## 📚 Full Documentation

For the complete architectural blueprint, memory tier breakdown, API references, and data flow diagrams, read **[`GUIDE.md`](./GUIDE.md)**.
