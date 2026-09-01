import { agentStorage } from '../src/agents/mastra';

await agentStorage.init();
console.log('Mastra Postgres schema initialized successfully.');
