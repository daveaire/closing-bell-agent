import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildFixtureReport } from './fixture-report.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.env.PORT || 4173);
const page = fs.readFileSync(path.join(root, 'web/index.html'));

const server = http.createServer((request, response) => {
  if (request.url === '/api/report') {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify(buildFixtureReport()));
    return;
  }
  if (request.url === '/' || request.url === '/index.html') {
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    response.end(page);
    return;
  }
  response.writeHead(404).end('Not found');
});

server.listen(port, '127.0.0.1', () => {
  console.log(`Closing Bell Agent dashboard: http://127.0.0.1:${port}`);
});
