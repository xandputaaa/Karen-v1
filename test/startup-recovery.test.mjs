import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('page has visible fallback when JavaScript fails to start',()=>{
 const html=readFileSync(new URL('../public/index.html',import.meta.url),'utf8');
 assert.match(html,/id="karen-boot"/);
 assert.match(html,/Reload KAREN/);
 assert.match(html,/unhandledrejection/);
 assert.match(html,/Still loading/);
});
test('initial app render is guarded',()=>{
 const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
 assert.match(js,/try\{render\(\);window\.__karenBooted=true\}catch\(error\)/);
});
