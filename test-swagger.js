const http = require('https');

const options = {
  hostname: 'lacos-microcredito-api.vercel.app',
  port: 443,
  path: '/api-docs',
  method: 'GET'
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY length:', body.length));
});

req.on('error', (e) => console.error(e));
req.end();
