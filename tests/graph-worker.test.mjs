import test from 'node:test';
import assert from 'node:assert/strict';
import { Worker } from 'node:worker_threads';
import { indexGraph } from '../src/graph/model.js';
import { layoutGraph } from '../src/graph/layout.js';

test('layout worker executes actual module and transfers complete positions', {timeout:10000}, async()=>{
 const url=new URL('../src/graph/layout.worker.js',import.meta.url).href;
 const worker=new Worker(`const {parentPort}=require('node:worker_threads');
 global.self={postMessage:(data,transfer)=>parentPort.postMessage(data,transfer)};
 import(${JSON.stringify(url)}).then(()=>{parentPort.on('message',data=>self.onmessage({data}));parentPort.postMessage({ready:true});});`,{eval:true});
 try {
  await new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});
  const graph=indexGraph([{id:'a',type:'company'},{id:'b',type:'website'}],[{id:'e',source:'a',target:'b'}]);
  const result=new Promise((resolve,reject)=>{worker.once('message',resolve);worker.once('error',reject);});
  worker.postMessage({graph:{nodes:graph.nodes,edges:graph.edges,components:graph.components},spacing:1});
  const {positions,error}=await result;assert.equal(error,undefined);
  assert.ok(positions instanceof Float32Array);assert.deepEqual(positions,layoutGraph(graph));
 } finally {await worker.terminate();}
});
