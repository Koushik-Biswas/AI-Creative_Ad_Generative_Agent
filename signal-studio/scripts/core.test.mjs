import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import ts from 'typescript';

const temporary = await fs.mkdtemp(path.join(os.tmpdir(), 'signal-core-'));
await fs.writeFile(path.join(temporary, 'package.json'), '{"type":"module"}');
for (const file of ['types', 'creative', 'demo']) {
  const source = await fs.readFile(new URL(`../lib/${file}.ts`, import.meta.url), 'utf8');
  const output = ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022}}).outputText.replaceAll('"./types"', '"./types.js"');
  await fs.writeFile(path.join(temporary, `${file}.js`), output);
}
const { creativeSvg, checks, zip } = await import(path.join(temporary,'creative.js'));
const { getDemo } = await import(path.join(temporary,'demo.js'));
test('creative SVG preserves escaped copy and all supported aspect ratios',()=>{
 const p=getDemo();
 for(const [ratio,width,height] of [['1:1',1200,1200],['1.91:1',1200,628],['4:5',1440,1800],['9:16',1080,1920]]){
  const c={...p.creatives[0],ratio,width,height,headline:'A clearer view <script> & a brighter future',body:'Business copy stays legible and safely escaped.'};
  const svg=creativeSvg(c,p);
  assert.ok(svg.includes(`width="${width}" height="${height}"`));
  assert.ok(svg.includes('&lt;script&gt;'));
  assert.ok(!svg.includes('<script>'));
  assert.equal(checks(c,p)[0].level,'pass');
 }
});
test('quality checks block unsupported numbers, excluded phrases and competitor names',()=>{
 const p=getDemo();p.avoid='guaranteed';
 const results=checks({...p.creatives[0],headline:'Guaranteed 999% faster than Taskwell (fictional)'},p);
 assert.equal(results.find(x=>x.label==='Verifiable numeric claims').level,'error');
 assert.equal(results.find(x=>x.label==='Campaign restrictions').level,'error');
});
test('ZIP exports contain UTF-8 names, correct CRC and central directory',async()=>{
 const data=new Uint8Array(await zip([{name:'meta/hello.txt',data:new TextEncoder().encode('hello')}]).arrayBuffer());
 const v=new DataView(data.buffer);
 assert.equal(v.getUint32(0,true),0x04034b50);
 assert.equal(v.getUint32(14,true),907060870);
 assert.equal(v.getUint16(data.length-12,true),1);
 assert.equal(v.getUint32(data.length-22,true),0x06054b50);
 const central=v.getUint32(data.length-6,true);
 assert.equal(v.getUint32(central,true),0x02014b50);
 assert.equal(v.getUint32(central+42,true),0);
});
