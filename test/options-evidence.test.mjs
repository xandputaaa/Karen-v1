import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
const js=readFileSync(new URL('../public/app.js',import.meta.url),'utf8');
test('browser script parses before release',()=>assert.doesNotThrow(()=>execFileSync(process.execPath,['--check','public/app.js'])));
test('options and trade flow unavailable sources are clearly labeled',()=>{assert.match(js,/function optionsEvidence\(\)/);assert.match(js,/GEX.*NOT CONNECTED/);assert.match(js,/Institutional positioning.*UNKNOWN/);assert.match(js,/no verified options chain/);assert.match(js,/function terminal\(\).*optionsEvidence\(\)/);assert.match(js,/function dataHealth\(\).*optionsEvidence\(\)/)});
