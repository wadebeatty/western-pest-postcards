const fs = require('fs');

function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === ',' && !inQuotes) { result.push(current); current = ''; }
    else { current += c; }
  }
  result.push(current);
  return result;
}

const data = fs.readFileSync('/Users/max/.openclaw/media/inbound/58e42028-4101-449c-bfa8-68b5929f241b---31cfac5e-1e31-4ce7-92f8-6489bc8f9de7.csv', 'utf8');
const lines = data.trim().split('\n');
const headers = parseCSVLine(lines[0]);

const idx = {
  groupId: 0,
  relType: 1,
  firstName: headers.indexOf('First Name'),
  lastName: headers.indexOf('Last Name'),
  deceased: headers.indexOf('Deceased'),
  mailingAddr: headers.indexOf('Mailing Address'),
  mailingCity: headers.indexOf('Mailing City'),
  mailingState: headers.indexOf('Mailing State'),
  mailingZip: headers.indexOf('Mailing Zip'),
  propAddr: headers.indexOf('Property Address'),
  propCity: headers.indexOf('Property City'),
  propState: headers.indexOf('Property State'),
  propZip: headers.indexOf('Property Zip'),
};

const owners = {};
let skippedDeceased = 0;
let skippedNoAddr = 0;

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  if (!row[1] || row[1] !== 'OWNER1') continue;
  
  const deceased = row[idx.deceased];
  if (deceased === 'Y') { skippedDeceased++; continue; }
  
  const groupId = row[idx.groupId];
  const firstName = row[idx.firstName] || '';
  const lastName = row[idx.lastName] || '';
  
  let addr = (row[idx.mailingAddr] || row[idx.propAddr] || '').replace(/"/g, '').trim();
  let city = (row[idx.mailingCity] || row[idx.propCity] || '').replace(/"/g, '').trim();
  let state = (row[idx.mailingState] || row[idx.propState] || '').replace(/"/g, '').trim();
  let zip = (row[idx.mailingZip] || row[idx.propZip] || '').replace(/"/g, '').trim();
  
  if (!addr || !city) { skippedNoAddr++; continue; }
  
  if (!owners[groupId]) {
    owners[groupId] = { firstName, lastName, addr, city, state, zip };
  }
}

const list = Object.values(owners);
console.log('Total sendable: ' + list.length);
console.log('Skipped deceased: ' + skippedDeceased);
console.log('Skipped no address: ' + skippedNoAddr);
console.log('\nSample first 10:');
list.slice(0,10).forEach(r => console.log(r.firstName + ' ' + r.lastName + ' | ' + r.addr + ', ' + r.city + ' ' + r.state + ' ' + r.zip));

// Save to JSON for postcard script
fs.writeFileSync('/Users/max/automated-postcard-system/green-springs-leads.json', JSON.stringify(list, null, 2));
console.log('\nSaved to green-springs-leads.json');
