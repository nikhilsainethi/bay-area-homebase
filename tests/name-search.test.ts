import {test} from 'node:test';
import assert from 'node:assert/strict';
import {nameSearchQuery} from '../lib/name-search.ts';
void test('name search stays within South Bay and escapes literal names',()=>{
 const q=nameSearchQuery('  Avalon (A+B) "Homes"  ');
 assert.ok(q.includes('(37.15,-122.25,37.6,-121.7)'));
 assert.ok(q.includes(JSON.stringify('Avalon \\(A\\+B\\) "Homes"')));
 assert.ok(q.endsWith('out center tags 60;'));
});
void test('name search rejects empty, broad and oversized input',()=>{
 for(const name of ['', 'ab', 'x'.repeat(101)]) assert.throws(()=>nameSearchQuery(name));
});
