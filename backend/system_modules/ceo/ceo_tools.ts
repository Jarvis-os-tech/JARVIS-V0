import { executeCeoMission, prescribeWorkflow, CeoProgressCallback } from './ceo_orchestrator';
import { loadAgentRoster, getAgent } from './ceo_roster';
import { findAgentSessions, loadMasterSessionIndex, recordAgentSession } from './ceo_session_logger';

export const CEO_TOOL_DECLARATIONS = [
  {
    name: 'ceo_execute_mission',
    description: 'Execute an autonomous engineering mission as J.A.R.V.I.S. CEO: prescribes workflow using CEO skills, delegates to Hermes (CTO/Lead Engineer), runs quality gate audit (lint/tsc), logs session into the central single-index, and provides an executive summary.',
    parameters: {
      type: 'OBJECT',
      properties: {
        goal: {
          type: 'STRING',
          description: 'The high-level technical objective, feature request, bug fix, or refactoring goal to execute.'
        }
      },
      required: ['goal']
    }
  },
  {
    name: 'ceo_query_agent_sessions',
    description: 'Query past agent conversation sessions and work history from the Central Memory single-index file (e.g., recall past discussions with Hermes or other agents).',
    parameters: {
      type: 'OBJECT',
      properties: {
        agent_name: {
          type: 'STRING',
          description: "Name of the subagent to query (e.g. 'Hermes', 'Opencode'). Leave empty to query across all agents."
        },
        query: {
          type: 'STRING',
          description: "Topic or keyword to search for (e.g. 'mem0', 'evolution', 'refactoring')."
        }
      }
    }
  },
  {
    name: 'ceo_get_roster',
    description: 'Retrieve the current autonomous agent organization roster, showing active CEO (J.A.R.V.I.S.), active workers (Hermes), and planned agents.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  },
  {
    name: 'ceo_prescribe_workflow',
    description: 'Analyze user intent and recommend the CEO workflow prescription, recommended skills, and delegation breakdown before execution.',
    parameters: {
      type: 'OBJECT',
      properties: {
        goal: {
          type: 'STRING',
          description: 'The technical or organizational objective.'
        }
      },
      required: ['goal']
    }
  }
];

export async function dispatchCeoTool(
  toolName: string,
  args: Record<string, any>,
  onProgress?: CeoProgressCallback
): Promise<{ success: boolean; result: any; executiveBriefing: string }> {
  switch (toolName) {
    case 'ceo_execute_mission': {
      const goal = args.goal || '';
      if (!goal) {
        return {
          success: false,
          result: { error: 'Mission goal is required' },
          executiveBriefing: 'Sir, I require an objective or directive before delegating tasks to Hermes.'
        };
      }
      const missionResult = await executeCeoMission(goal, onProgress);
      return {
        success: missionResult.success,
        result: missionResult,
        executiveBriefing: missionResult.executiveSummary
      };
    }

    case 'ceo_query_agent_sessions': {
      const agentName = args.agent_name;
      const query = args.query;
      const sessions = findAgentSessions(agentName, query);

      let briefing = '';
      if (sessions.length === 0) {
        briefing = `Sir, I inspected the Central Memory Index, but found no matching sessions for ${agentName ? `agent ${agentName}` : 'any agent'} regarding '${query || 'all'}'.`;
      } else {
        const top = sessions[0];
        briefing = `Sir, according to our Central Memory Index, on ${top.date} in Session ${top.session.sessionId}, ${top.agent} recorded: "${top.session.topic}". Summary: ${top.session.summary}`;
      }

      return {
        success: true,
        result: {
          matchCount: sessions.length,
          sessions
        },
        executiveBriefing: briefing
      };
    }

    case 'ceo_get_roster': {
      const roster = loadAgentRoster();
      const activeWorkerNames = Object.values(roster.agents)
        .filter(a => a.status === 'ACTIVE_WORKER')
        .map(a => a.name)
        .join(', ');

      const plannedNames = Object.values(roster.agents)
        .filter(a => a.status === 'PLANNED')
        .map(a => a.name)
        .join(', ');

      const briefing = `Sir, as CEO I command our autonomous workforce. Currently active in our engineering division is ${activeWorkerNames}. We also have planned provisions for ${plannedNames}.`;

      return {
        success: true,
        result: roster,
        executiveBriefing: briefing
      };
    }

    case 'ceo_prescribe_workflow': {
      const goal = args.goal || '';
      const prescription = prescribeWorkflow(goal);
      const briefing = `Sir, for "${goal}", I prescribe a ${prescription.type} workflow. Recommended skills: ${prescription.recommendedSkills.join(', ')}. Assigned primary worker: ${prescription.assignedAgent.toUpperCase()}.`;

      return {
        success: true,
        result: prescription,
        executiveBriefing: briefing
      };
    }

    default:
      return {
        success: false,
        result: { error: `Unknown CEO tool: ${toolName}` },
        executiveBriefing: `Apologies sir, the requested CEO directive '${toolName}' is not recognized.`
      };
  }
}
