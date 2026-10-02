import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { ContinuousExecutionQueue } from '../system_modules/intelligent_system/continuous_execution_queue';

function fakeSocket() {
  const messages: any[] = [];
  return {
    socket: {
      readyState: WebSocket.OPEN,
      send(payload: string) {
        messages.push(JSON.parse(payload));
      }
    } as unknown as WebSocket,
    messages
  };
}

const silentSpeech = {
  async synthesizeJarvisSpeech() {
    return { audioBase64: 'AA==', format: 'audio/pcm;rate=24000', sampleRate: 24000 };
  }
} as any;

async function waitFor(predicate: () => boolean, timeoutMs = 1500): Promise<void> {
  const started = Date.now();
  while (!predicate()) {
    if (Date.now() - started > timeoutMs) throw new Error('Timed out waiting for queue event');
    await new Promise(resolve => setTimeout(resolve, 5));
  }
}

async function runTests() {
  console.log('🧪 Continuous execution queue tests');

  const order: string[] = [];
  const { socket, messages } = fakeSocket();
  const queue = new ContinuousExecutionQueue({
    speech: silentSpeech,
    executor: async (tool) => {
      order.push(`${tool}:start`);
      await new Promise(resolve => setTimeout(resolve, 20));
      order.push(`${tool}:end`);
      return { success: true, tool };
    }
  });

  const receipt = queue.start(socket, {
    title: 'Open and prepare',
    actions: [
      { tool: 'launch_application', args: { app_name: 'youtube' }, label: 'Open YouTube' },
      { tool: 'open_folder', args: { folder_path: 'downloads' }, label: 'Open Downloads' }
    ]
  });

  assert.equal(receipt.actionCount, 2);
  assert.equal(order.length, 0, 'start() must return before async execution runs');
  await waitFor(() => messages.some(m => m.type === 'continuous_plan_completed'));
  assert.deepEqual(order, [
    'launch_application:start',
    'launch_application:end',
    'open_folder:start',
    'open_folder:end'
  ]);

  const failureMessages: any[] = [];
  const failureSocket = fakeSocket();
  const failingQueue = new ContinuousExecutionQueue({
    speech: silentSpeech,
    executor: async (tool) => {
      failureMessages.push(tool);
      return tool === 'open_folder' ? { success: false, error: 'folder unavailable' } : { success: true };
    }
  });
  failingQueue.start(failureSocket.socket, {
    actions: [
      { tool: 'launch_application' },
      { tool: 'open_folder' },
      { tool: 'close_window' }
    ]
  });
  await waitFor(() => failureSocket.messages.some(m => m.type === 'continuous_plan_failed'));
  assert.deepEqual(failureMessages, ['launch_application', 'open_folder'], 'failure must stop later steps');

  console.log('✅ Continuous queue sequencing, immediate receipt, and fail-stop behavior passed');
}

runTests().catch(error => {
  console.error('❌ Continuous queue test failed:', error);
  process.exit(1);
});
