require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();
app.use(cors());
const GH = 'https://api.github.com';
const headers = {
  'Authorization': `Bearer ${process.env.GH_TOKEN}`,
  'Accept': 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28'
};

// tiny cache 
const cache = new Map();
const put = (k,v,ms=60_000)=>cache.set(k,{v,exp:Date.now()+ms});
const get = (k)=>{ const x=cache.get(k); if(!x) return null; if(Date.now()>x.exp){cache.delete(k); return null;} return x.v; };

app.get('/api/user/:u', async (req,res)=>{
  const key=`user:${req.params.u}`;
  const hit=get(key); if(hit) return res.json(hit);
  const r = await fetch(`${GH}/users/${req.params.u}`, { headers });
  const j = await r.json(); put(key,j,5*60_000); res.json(j);
});

app.get('/api/repos/:u', async (req,res)=>{
  const key=`repos:${req.params.u}`;
  const hit=get(key); if(hit) return res.json(hit);
  const r = await fetch(`${GH}/users/${req.params.u}/repos?per_page=100&sort=updated`, { headers });
  const j = await r.json(); put(key,j,5*60_000); res.json(j);
});

app.get('/api/repo/:owner/:repo/languages', async (req,res)=>{
  const { owner, repo } = req.params;
  const key=`lang:${owner}/${repo}`;
  const hit=get(key); if(hit) return res.json(hit);
  const r = await fetch(`${GH}/repos/${owner}/${repo}/languages`, { headers });
  const j = await r.json(); put(key,j,24*60*60_000); res.json(j);
});

app.get('/api/repo/:owner/:repo/commits', async (req,res)=>{
  const { owner, repo } = req.params;
  const since = req.query.since || new Date(Date.now()-90*24*3600*1000).toISOString();
  const r = await fetch(`${GH}/repos/${owner}/${repo}/commits?since=${encodeURIComponent(since)}&per_page=100`, { headers });
  res.json(await r.json());
});

app.get('/api/repo/:owner/:repo/issues', async (req,res)=>{
  const { owner, repo } = req.params;
  const r = await fetch(`${GH}/repos/${owner}/${repo}/issues?state=all&per_page=100`, { headers });
  res.json(await r.json());
});

app.listen(process.env.PORT || 9797, ()=>console.log('API on', process.env.PORT||8787));
