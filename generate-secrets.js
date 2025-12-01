const crypto = require('crypto');

console.log('NEXTAUTH_SECRET:', crypto.randomBytes(32).toString('base64'));
console.log('JWT_SECRET:', crypto.randomBytes(32).toString('base64'));
