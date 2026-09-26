#!/usr/bin/env python3
"""
Example 1: Continuous Living Memory & Dialogue Capture
Demonstrates logging conversational turns into the perpetual unbroken log
and extracting the living dialogue context for system prompt injection.
"""

import sys
from pathlib import Path

# Add bundle root to path
bundle_root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(bundle_root))

from brain_adapter.memory_adapter import memory_engine

def main():
    print("=" * 60)
    print("🔄 CONTINUOUS LIVING MEMORY DEMO")
    print("=" * 60)

    # 1. Log dialogue turns (persists to conversations/conversation.md and SQLite)
    print("\n1. Logging turns into the continuous conversation...")
    memory_engine.log_conversation_turn("Operator Gopi", "Jarvis, activate memory telemetry sweep.", role="user")
    memory_engine.log_conversation_turn("JARVIS", "Telemetry sweep active, Sir. All persistent vaults online.", role="agent")
    memory_engine.log_conversation_turn("Operator Gopi", "Remember that project Ironclad deadline is next Friday.", role="user")
    memory_engine.log_conversation_turn("JARVIS", "Acknowledged. Ironclad milestone recorded in your sovereign vault.", role="agent")

    # 2. Retrieve recent turns
    print("\n2. Fetching recent turns from the continuous stream:")
    recent_turns = memory_engine.get_recent_conversation_turns(limit=5)
    for t in recent_turns:
        print(f"   [{t['speaker']}]: {t['text']}")

    # 3. Read raw transcript from the Markdown vault file
    print("\n3. Reading continuous transcript directly from Markdown vault:")
    transcript = memory_engine.get_continuous_transcript(max_turns=3)
    print(transcript)

    # 4. Generate system prompt injection block
    print("\n4. Generated Prompt Context for LLM:")
    summary = memory_engine.get_continuous_dialogue_summary(max_turns=4)
    print(summary)

    print("\n✅ Continuous dialogue demo completed successfully!")

if __name__ == "__main__":
    main()
