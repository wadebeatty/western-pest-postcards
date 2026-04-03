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
  ownershipMonths: headers.indexOf('Ownership Length (Months)'),
  estimatedValue: headers.indexOf('Estimated Value'),
  subdivision: headers.indexOf('Subdivision'),
};

const owners = {};

for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]);
  if (!row[1] || row[1] !== 'OWNER1') continue;
  if (row[idx.deceased] === 'Y') continue;

  const groupId = row[idx.groupId];
  if (owners[groupId]) continue;

  const months = parseInt(row[idx.ownershipMonths] || '999');
  if (months > 12) continue;

  const firstName = row[idx.firstName] || '';
  const lastName = row[idx.lastName] || '';
  let addr = (row[idx.mailingAddr] || row[idx.propAddr] || '').replace(/"/g, '').trim();
  let city = (row[idx.mailingCity] || row[idx.propCity] || '').replace(/"/g, '').trim();
  let state = (row[idx.mailingState] || row[idx.propState] || '').replace(/"/g, '').trim();
  let zip = (row[idx.mailingZip] || row[idx.propZip] || '').replace(/"/g, '').trim();
  const value = row[idx.estimatedValue] || '';
  const sub = row[idx.subdivision] || '';

  if (!addr || !city) continue;

  owners[groupId] = { firstName, lastName, addr, city, state, zip, months, value, sub };
}

const list = Object.values(owners).sort((a, b) => a.months - b.months);

console.log('New movers (0-12 months): ' + list.length);
console.log('\nBreakdown by ownership months:');
const buckets = {};
list.forEach(r => { buckets[r.months] = (buckets[r.months] || 0) + 1; });
Object.keys(buckets).sort((a,b) => a-b).forEach(k => console.log('  ' + k + ' months: ' + buckets[k]));

console.log('\nSample first 10:');
list.slice(0,10).forEach(r => console.log(r.months + 'mo | ' + r.firstName + ' ' + r.lastName + ' | ' + r.addr + ', ' + r.city + ' ' + r.state + ' ' + r.zip + ' | $' + parseInt(r.value).toLocaleString()));

fs.writeFileSync('/Users/max/automated-postcard-system/new-movers-12mo.json', JSON.stringify(list, null, 2));
console.log('\nSaved to new-movers-12mo.json');
