/**
 * AssistantGreeter / JarvisGreeter Module
 * Manages time-of-day detection, daily greeting frequency via localStorage,
 * and session duration tracking for long-usage awareness upon activation.
 */

export class AssistantGreeter {
  private sessionStartTime: number = Date.now();

  /** Determines current time of day */
  public getTimeOfDay(): 'morning' | 'afternoon' | 'evening' | 'night' {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return 'morning';
    if (hour >= 12 && hour < 17) return 'afternoon';
    if (hour >= 17 && hour < 22) return 'evening';
    return 'night';
  }

  /** Retrieves daily greeting count from localStorage, resetting if date changes */
  public getDailyGreetingCount(): { count: number; date: string } {
    try {
      const today = new Date().toISOString().split('T')[0];
      const stored = localStorage.getItem('nova_daily_greetings') || localStorage.getItem('jarvis_daily_greetings');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.date === today) {
          return parsed;
        }
      }
      return { count: 0, date: today };
    } catch {
      return { count: 0, date: new Date().toISOString().split('T')[0] };
    }
  }

  /** Increments and persists daily greeting count */
  public incrementDailyGreetingCount(): number {
    try {
      const current = this.getDailyGreetingCount();
      const newCount = current.count + 1;
      localStorage.setItem(
        'nova_daily_greetings',
        JSON.stringify({ count: newCount, date: current.date })
      );
      return newCount;
    } catch {
      return 1;
    }
  }

  /** Calculates session duration in minutes */
  public getSessionDurationMinutes(): number {
    return Math.floor((Date.now() - this.sessionStartTime) / 60000);
  }

  /** Gathers full context for the greeting prompt */
  public getGreetingContext(agentName: string = 'Nova') {
    const dailyCount = this.incrementDailyGreetingCount();
    const sessionDurationMins = this.getSessionDurationMinutes();
    const isLongSession = sessionDurationMins >= 25; // 25+ minutes flagged as prolonged activity
    return {
      dailyCount,
      sessionDurationMins,
      isLongSession,
      timeOfDay: this.getTimeOfDay(),
      generateDynamicPrompt: () => {
        const timeOfDay = this.getTimeOfDay();
        const longSessionNote = isLongSession
          ? ` Note: We have been chatting for over ${sessionDurationMins} minutes today across ${dailyCount} sessions. Give a warm, friendly acknowledgement.`
          : ` This is friendly greeting number ${dailyCount} today.`;

        const variations = [
          `Say a warm, friendly, natural 1-sentence ${timeOfDay} greeting as ${agentName}.${longSessionNote} Be cheerful, conversational, and welcoming.`,
          `Say hello with a bright, friendly smile in 1 brief sentence as ${agentName}.${longSessionNote} Refer to the ${timeOfDay} and sound happy to chat.`,
          `Greet me with friendly, positive warmth in 1 short spoken sentence as ${agentName}.${longSessionNote} Sound engaging and caring.`,
          `Give a warm, conversational 1-sentence opening as ${agentName}.${longSessionNote} Let me know you're here and ready to talk or help.`,
          `Welcome me back with a sweet, cheerful line as ${agentName}.${longSessionNote} Use warm, natural language tailored to this ${timeOfDay}.`
        ];

        const pick = variations[Math.floor(Math.random() * variations.length)];
        return `${pick} [Random seed: ${Math.floor(Math.random() * 100000)}]`;
      }
    };
  }
}

export const assistantGreeterInstance = new AssistantGreeter();
