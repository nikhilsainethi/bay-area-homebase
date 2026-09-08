import {test} from 'node:test';
import assert from 'node:assert/strict';
import {normalizePlaces} from '../lib/domain.ts';
void test('real property names lead and addresses remain separate',()=>{
 const [p]=normalizePlaces({elements:[{type:'way',id:1,lat:37.4,lon:-122,tags:{name:'Park Apartments','addr:housenumber':'1725','addr:street':'Wright Avenue'}}]});
 assert.equal(p.name,'Park Apartments');assert.equal(p.address,'1725 Wright Avenue');assert.equal(p.nameKnown,true);
});
void test('missing or address-only names never become made-up apartment names',()=>{
 for(const name of [undefined,'1725 Wright Avenue','1725','Building A','Block 2']){
 const [p]=normalizePlaces({elements:[{id:1,lat:37.4,lon:-122,tags:{name,'addr:housenumber':'1725','addr:street':'Wright Avenue'}}]});
 assert.equal(p.nameKnown,false);assert.equal(p.name,'Apartment · name not mapped');assert.equal(p.address,'1725 Wright Avenue');
 }
});
void test('official name and contact address tags recover available details',()=>{
 const [p]=normalizePlaces({elements:[{id:1,lat:37.4,lon:-122,tags:{official_name:'Garden Homes','contact:housenumber':'10','contact:street':'Main Street','contact:city':'Sunnyvale'}}]});
 assert.equal(p.name,'Garden Homes');assert.equal(p.address,'10 Main Street, Sunnyvale');
});
