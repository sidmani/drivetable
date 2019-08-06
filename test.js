const dt = require('./src');
const readline = require('readline');
const qs = require('querystringify');
const assert = require('assert');

async function run(token) {
  try {
  console.log('Running tests');
  const drivetable = new dt(token, 'root');
  const t = await drivetable.table(`test ${new Date().getTime()}`);

  const objects = [{ id: 'test3', foo: 'bar', idx: '0' }, { id: 'test4', foo2: 'bar2', idx: '1' }, { id: 'test5', foo: 'bar', idx: '2' }];

  function sortIdx(a, b) {
    return parseInt(a.idx, 10) - parseInt(b.idx, 10);
  }

  console.log(objects);

  const ids = t.batchPut(objects);
  console.log(ids);
  assert.deepEqual(ids, objects.map(o => o.id));
  console.log('OK put/batchPut');

  const get = await Promise.all(t.batchGet(['test3', 'test5']));
  assert.deepEqual(get.sort(sortIdx), [objects[0], objects[2]]);
  console.log('OK get/batchGet');

  const contents = await t.query();
  assert.deepEqual(contents.sort(sortIdx), objects);
  console.log('OK empty query');

  const filteredContents = await t.query({ foo: 'bar' });
  assert.deepEqual(filteredContents.sort(sortIdx), [objects[0], objects[2]])
  console.log('OK query')

  await t.delete('test3');
  assert.deepEqual((await t.query()).sort(sortIdx), [objects[1], objects[2]]);
  console.log('OK deletion');

  console.log('All tests OK.');
  }
  catch (e) { console.log(e);  }
 }

const query = qs.stringify({
  client_id: '325932421040-6rd6p3n2dbh8beiljdjk1o736q0cf36v.apps.googleusercontent.com',
  redirect_uri: 'https://localhost:8000',
  response_type: 'token',
  scope: 'https://www.googleapis.com/auth/drive.file',
  include_granted_scopes: true,
});

const authURL = `https://accounts.google.com/o/oauth2/v2/auth?${query}`;

console.log(`Load the URL ${authURL} in your browser.`);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

rl.question('Paste the hash (the bit after the #): ', function (answer) {
  const hash = qs.parse(answer);
  rl.close();
  run(hash.access_token).catch(e => console.log(e));
});
