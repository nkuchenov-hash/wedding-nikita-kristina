import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const gateway=readFileSync(new URL('../tools/admin-gateway.php',import.meta.url),'utf8');
test('login matches the approved always-light design without changing admin theme settings',()=>{
 assert.match(gateway,/name="color-scheme" content="only light"/);
 assert.match(gateway,/color-scheme:only light/);
 assert.doesNotMatch(gateway,/login-auto-theme|data-login-night|prefers-color-scheme: dark|id="login-theme"/);
 assert.match(gateway,/class="login-art-top"/);
 assert.match(gateway,/class="login-art-bottom"/);
 assert.match(gateway,/overflow:hidden/);
 assert.match(gateway,/name="username" value="wedding-admin" autocomplete="username"/);
 assert.match(gateway,/name="password" type="password" autocomplete="current-password"/);
 assert.match(gateway,/button\[type=submit\]/);
 assert.match(gateway,/refresh_login_csrf=1/);
});

test('desktop login uses a two-column layout while mobile keeps the vertical artwork',()=>{
 assert.match(gateway,/@media\(min-width:700px\)\{[^]*?grid-template-columns:minmax\(0,43fr\) minmax\(0,57fr\)/);
 assert.match(gateway,/\.login-art-top\{height:auto;[^}]*background-size:contain/);
 assert.match(gateway,/\.login-art-bottom\{display:none\}/);
 assert.match(gateway,/@media\(max-width:500px\)/);
});
