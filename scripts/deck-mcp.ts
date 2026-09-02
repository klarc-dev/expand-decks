#!/usr/bin/env node
import { deckMcpServer } from '../src/mcp/deckServer';

await deckMcpServer.startStdio();
