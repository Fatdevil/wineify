import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, stat } from 'node:fs/promises';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');
const port = Number(process.env.PORT) || 5173;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg'
};

const server = http.createServer(async (req, res) => {
  try {
    const requestUrl = new URL(req.url, `http://${req.headers.host}`);
    let relativePath = requestUrl.pathname;
    if (relativePath.endsWith('/')) {
      relativePath = path.join(relativePath, 'index.html');
    }

    const filePath = path.join(projectRoot, relativePath);
    if (!filePath.startsWith(projectRoot)) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    let fileStat;
    try {
      fileStat = await stat(filePath);
    } catch (error) {
      res.writeHead(404).end('Not Found');
      return;
    }

    if (fileStat.isDirectory()) {
      res.writeHead(403).end('Forbidden');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';
    const content = await readFile(filePath);

    res.writeHead(200, { 'Content-Type': contentType });
    res.end(content);
  } catch (error) {
    console.error(error);
    res.writeHead(500).end('Internal Server Error');
  }
});

server.listen(port, () => {
  console.log(`Dashboard available at http://localhost:${port}`);
});
