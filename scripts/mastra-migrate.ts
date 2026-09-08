import { initializeAgentStorage } from '../src/agents/mastra';

await initializeAgentStorage();
console.log('Mastra Postgres schema initialized successfully.');
