// Build preview postcard for first new mover using Scott's photo
const fs = require('fs');

let script = fs.readFileSync('rebuild-phone.js', 'utf8');

// Fix paths
script = script.replaceAll('/Users/max/.openclaw/westernmarketing/', '/Users/max/Library/Mobile Documents/com~apple~CloudDocs/openclaw/westernmarketing/');

// Set tech to Scott
script = script.replace(/const FIELD_TECHS = \[[\s\S]*?\];/, "const FIELD_TECHS = ['scott'];");

// Load first 5 new movers as PEOPLE
const leads = JSON.parse(fs.readFileSync('new-movers-12mo.json', 'utf8'));
const sample = leads.slice(0, 5);
const peopleStr = 'const PEOPLE = [\n' + sample.map(r => 
  `  { name: '${r.firstName} ${r.lastName}', addr: '${r.addr}', city: '${r.city}', st: '${r.state}', zip: '${r.zip}' },`
).join('\n') + '\n];';

script = script.replace(/const PEOPLE = \[[\s\S]*?\];/, peopleStr);
fs.writeFileSync('batch-preview.js', script);
console.log('Preview script built for ' + sample.length + ' addresses');
sample.forEach(r => console.log('  - ' + r.firstName + ' ' + r.lastName + ' | ' + r.addr));
