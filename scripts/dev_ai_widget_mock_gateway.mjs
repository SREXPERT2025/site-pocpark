import http from 'node:http';

const port = Number(process.env.PORT || 8787);
const configuredDelayMs = Number(process.env.MOCK_DELAY_MS || 600);

const server = http.createServer((request, response) => {
  if (request.method !== 'POST' || request.url !== '/v1/chat') {
    response.writeHead(404).end();
    return;
  }

  let body = '';
  request.setEncoding('utf8');
  request.on('data', (chunk) => {
    body += chunk;
  });
  request.on('end', () => {
    const delayMs = Number.isFinite(configuredDelayMs)
      ? Math.max(0, configuredDelayMs)
      : 600;
    setTimeout(() => {
      response.writeHead(200, {
        'Content-Type': 'text/plain; charset=utf-8',
        'X-AI-Widget-Route': 'local_ux_preview',
      });
      response.end(
        'Для такого объекта начните с описания потока автомобилей, количества въездов и групп пользователей. Затем можно сравнить способы доступа и подобрать состав оборудования без преждевременной фиксации решения.',
      );
    }, delayMs);
  });
});

server.listen(port, '127.0.0.1', () => {
  console.log(`LOCAL_AI_WIDGET_MOCK_GATEWAY=http://127.0.0.1:${port}`);
});
