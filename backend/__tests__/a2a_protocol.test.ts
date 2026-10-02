/**
 * J.A.R.V.I.S. Agent2Agent (A2A) Protocol & Squad Integration Tests
 */

import { cliAgentRegistry } from '../system_modules/intelligent_system/cli_agent_registry';
import { a2aHub } from '../system_modules/intelligent_system/a2a_hub';
import { ideAgentBridge } from '../system_modules/intelligent_system/ide_agent_bridge';
import { webAgentBridge } from '../system_modules/intelligent_system/web_agent_bridge';
import { A2ARequest } from '../system_modules/intelligent_system/a2a_types';

async function runTests() {
  console.log('====================================================');
  console.log(' [TEST] Starting J.A.R.V.I.S. A2A Protocol & Squad Tests');
  console.log('====================================================');

  let passed = 0;
  let total = 0;

  function assert(condition: boolean, msg: string) {
    total++;
    if (condition) {
      console.log(`  ✓ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ✗ FAIL: ${msg}`);
      process.exitCode = 1;
    }
  }

  // 1. Test CLI Agent Discovery & Manifest Parsing
  console.log('\n--- 1. CLI Agent Registry & Discovery ---');
  await cliAgentRegistry.initialize();
  const allAgents = cliAgentRegistry.getAllAgents();
  assert(allAgents.length >= 4, `Discovered at least 4 agents in manifest (found: ${allAgents.length})`);

  const claudeAgent = cliAgentRegistry.getAgent('claude');
  assert(!!claudeAgent, 'Claude Code agent is registered in manifest');
  assert(claudeAgent?.isAvailable === true, `Claude Code binary is verified available (${claudeAgent?.resolvedPath})`);

  const codexAgent = cliAgentRegistry.getAgent('codex');
  assert(!!codexAgent, 'Codex CLI agent is registered in manifest');
  assert(codexAgent?.isAvailable === true, `Codex binary is verified available (${codexAgent?.resolvedPath})`);

  const hermesAgent = cliAgentRegistry.getAgent('hermes');
  assert(!!hermesAgent, 'Hermes agent is registered in manifest');

  // 2. Test Master Agent Card (A2A Spec Compliance)
  console.log('\n--- 2. A2A Master Agent Card Generation ---');
  const masterCard = a2aHub.getMasterAgentCard();
  assert(masterCard.name === 'J.A.R.V.I.S. OS', `Master Agent Card name matches ('${masterCard.name}')`);
  assert(masterCard.domain === 'core', `Master Agent domain is 'core'`);
  assert(masterCard.defaultInputModes.includes('text/plain'), 'Supports text/plain input mode');
  assert(masterCard.skills.length > 0, `Master card exposes skills (count: ${masterCard.skills.length})`);

  // 3. Test Cross-Domain Agent Cards (CLI, IDE, Web)
  console.log('\n--- 3. Cross-Domain Agent Cards (CLI, IDE, Web) ---');
  const ideCards = ideAgentBridge.getAgentCards();
  assert(ideCards.length >= 2, `IDE bridge exposes at least 2 cards (Orca & Antigravity)`);
  assert(ideCards.some(c => c.name.includes('Orca')), 'Orca IDE card is present');

  const webCards = webAgentBridge.getAgentCards();
  assert(webCards.length >= 1, `Web bridge exposes OpenManus card`);

  const allCards = a2aHub.listAllAgentCards();
  assert(allCards.length >= 5, `A2A Hub aggregates all cross-domain cards (total: ${allCards.length})`);

  // 4. Test A2A JSON-RPC 2.0 Request Handling
  console.log('\n--- 4. A2A JSON-RPC 2.0 Handler ---');
  const listReq: A2ARequest = {
    jsonrpc: '2.0',
    id: 'req-1',
    method: 'agents.list',
    params: {}
  };
  const listRes: any = await a2aHub.handleRpcRequest(listReq);
  assert(listRes.jsonrpc === '2.0', 'JSON-RPC response matches version 2.0');
  assert(listRes.id === 'req-1', 'JSON-RPC response matches request ID');
  assert(listRes.result?.agents?.length >= 5, 'agents.list returned aggregated squad members');

  const getCardReq: A2ARequest = {
    jsonrpc: '2.0',
    id: 'req-2',
    method: 'agent.getCard',
    params: { agentId: 'claude' }
  };
  const getCardRes: any = await a2aHub.handleRpcRequest(getCardReq);
  assert(getCardRes.result?.name === 'Claude Code', `agent.getCard retrieved Claude Code card`);

  // 5. Test JSON-RPC Error Handling
  console.log('\n--- 5. JSON-RPC Error Handling ---');
  const invalidReq: any = { method: 'unknown.method' };
  const errRes: any = await a2aHub.handleRpcRequest(invalidReq);
  assert(errRes.error?.code === -32600, 'Invalid request returns -32600 code');

  console.log('\n====================================================');
  console.log(` [TEST SUMMARY] ${passed}/${total} assertions PASSED`);
  console.log('====================================================');
}

runTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
