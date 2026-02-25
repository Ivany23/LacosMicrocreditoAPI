const http = require('http');

const data = JSON.stringify({
  emprestimoId: '4',
  valorPago: 4000,
  metodoPagamento: 'M-Pesa'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/pagamentos/diario',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length,
    'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VybmFtZSI6Iml2YW55Lm1hc3NpbmdhIiwic3ViIjoiMiIsImlhdCI6MTc3MjAzOTU3MCwiZXhwIjoxNzcyMTI1OTcwfQ.ZUawM8H_6RN4VhrOrUpnxpbZsOkfLdxbruSwmjXojOs'
  }
};

const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (d) => body += d);
  res.on('end', () => console.log('STATUS:', res.statusCode, 'BODY:', body));
});

req.on('error', (e) => console.error(e));
req.write(data);
req.end();
