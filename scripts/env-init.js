// Creates .env from .env.example with freshly generated secrets and database passwords.
//   npm run env:init             -> only if .env does not exist
//   npm run env:init -- --force  -> regenerate (invalidates sessions; existing DB volumes keep old passwords)
const crypto = require('crypto');
const fs = require('fs');

if (fs.existsSync('.env') && !process.argv.includes('--force')) {
  console.log('.env already exists; left untouched. Use "npm run env:init -- --force" to regenerate it.');
  process.exit(0);
}

const generated = {};
const value = (token) => (generated[token] ??= crypto.randomBytes(36).toString('base64url'));
const content = fs.readFileSync('.env.example', 'utf8').replace(/__GENERATE_[A-Z_]+__/g, value);

fs.writeFileSync('.env', content, { mode: 0o600 });
console.log(`.env created with ${Object.keys(generated).length} generated secrets (${Object.keys(generated).join(', ')}).`);
