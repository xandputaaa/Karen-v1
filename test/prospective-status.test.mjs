import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const s=readFileSync(new URL('../validation.mjs',import.meta.url),'utf8');
test('validation headline identifies the actual current model',()=>{assert.match(s,/return \{ok:true,model:MODEL_VERSION,modelLabel:/)});
test('headline review state follows prospective model rather than legacy settled sample',()=>{assert.match(s,/status:prospectiveShadowAudit\(finished\)\.reviewReady\?'PROSPECTIVE_REVIEW_REQUIRED':'COLLECTING_PROSPECTIVE_OUTCOMES'/)});
