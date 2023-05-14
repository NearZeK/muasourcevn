const fs = require('fs');
const http = require('http');

function testProxy(proxy) {
  const options = {
    host: proxy.host,
    port: proxy.port,
    path: 'http://nearzekit.site',
    timeout: 5000
  };

  const req = http.get(options, (res) => {
    console.log(`Proxy ${proxy.host}:${proxy.port} is live`);

    // Ghi proxy live vào file proxy_live.txt
    fs.appendFile('proxy_live.txt', `${proxy.host}:${proxy.port}\n`, (err) => {
      if (err) {
        console.log('Error writing to proxy_live.txt:', err);
      }
    });
  });

  req.on('error', (error) => {
    console.log(`Proxy ${proxy.host}:${proxy.port} is dead`);
  });

  req.on('timeout', () => {
    console.log(`Proxy ${proxy.host}:${proxy.port} is dead (timeout)`);
    req.abort();
  });
}

fs.readFile('proxies.txt', 'utf-8', (err, data) => {
  if (err) {
    console.log('Error reading proxy file:', err);
    return;
  }

  const proxies = data
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');

  proxies.forEach((proxy) => {
    const [host, port] = proxy.split(':');
    testProxy({ host, port });
  });
});
