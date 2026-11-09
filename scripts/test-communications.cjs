const {build}=require('esbuild'),path=require('path'),fs=require('fs'),assert=require('node:assert/strict');
(async()=>{
const root=path.resolve(__dirname,'..');process.env.DATABASE_URL='postgresql://postgres:postgres@127.0.0.1:55441/postgres?connection_limit=1';process.env.DRIVE_TOKEN_KEY=Buffer.alloc(32,7).toString('base64');

const {PGlite}=require('@electric-sql/pglite');
const {PGLiteSocketServer}=require('@electric-sql/pglite-socket');
const memory=await PGlite.create();
for(const name of fs.readdirSync(path.join(root,'prisma/migrations')).filter(n=>fs.statSync(path.join(root,'prisma/migrations',n)).isDirectory()).sort()) await memory.exec(fs.readFileSync(path.join(root,'prisma/migrations',name,'migration.sql'),'utf8'));
for(const [id,name,role] of [['admin','Admin','ADMIN'],['member','Member','JUNIOR_EDITOR'],['outsider','Outsider','JUNIOR_EDITOR']]) await memory.query('INSERT INTO "User" (id,name,email,"passwordHash",role) VALUES ($1,$2,$3,$4,$5)',[id,name,id+'@test.invalid','unused-test-hash',role]);
const server=new PGLiteSocketServer({db:memory,port:55441,host:'127.0.0.1'});await server.start();

const output=path.join(root,'node_modules/.cache/communications-test.cjs');fs.mkdirSync(path.dirname(output),{recursive:true});
await build({stdin:{contents:`export * from './src/app/(app)/chat/actions';export * from './src/lib/chat';export * from './src/lib/drive';export {prisma} from './src/lib/prisma';`,resolveDir:root,loader:'ts'},outfile:output,bundle:true,platform:'node',format:'cjs',packages:'external',tsconfig:path.join(root,'tsconfig.json'),plugins:[{name:'session-fixture',setup(b){b.onResolve({filter:/^@\/lib\/auth$/},()=>({path:'auth',namespace:'fixture'}));b.onResolve({filter:/^next\/cache$/},()=>({path:'cache',namespace:'fixture'}));b.onResolve({filter:/^server-only$/},()=>({path:'empty',namespace:'fixture'}));b.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='auth'?'export async function getCurrentUser(){return globalThis.__testActor}':args.path==='cache'?'export function revalidatePath(){}':'',loader:'js'}));}}]});
const api=require(output),db=api.prisma;const actors={};for(const id of ['admin','member','outsider'])actors[id]={...(await db.user.findUnique({where:{id}})),roles:[id==='admin'?'ADMIN':'JUNIOR_EDITOR']};
const as=id=>globalThis.__testActor=actors[id]??null;const send=(roomId,body,extra={})=>api.sendMessage({roomId,body,driveUrl:'',mentionIds:[],replyToId:null,...extra});
try {
as('admin');const dm=await api.openDirectMessage('member');assert(dm.roomId);as('member');assert.equal((await api.openDirectMessage('admin')).roomId,dm.roomId);as('outsider');assert.equal(await api.roomSnapshot(dm.roomId,'outsider'),null);as('admin');assert((await api.changeGroupMember(dm.roomId,'outsider',true)).error);
as('admin');const group=await api.createGroup({name:'Private test',memberIds:['member']});assert(group.roomId);const id=group.roomId;
as('outsider');assert.equal(await api.roomSnapshot(id,'outsider'),null);assert((await send(id,'Not allowed')).error);assert((await api.changeGroupMember(id,'outsider',true)).error);
as('admin');assert((await send(id,'Hello',{mentionIds:['outsider']})).error);assert((await send(id,'Hello',{driveUrl:'https://evil.invalid/file'})).error);
assert((await send(id,'Hello',{mentionIds:['member'],driveUrl:'https://drive.google.com/file/d/test/view'})).ok);
let snap=await api.roomSnapshot(id,'member');const message=snap.messages[0];assert.equal(snap.messages.length,1);
as('member');let rooms=await api.roomList('member');assert.equal(rooms.find(r=>r.id===id).unread,1);assert.equal(rooms.find(r=>r.id===id).mentions,1);
assert((await send(id,'Reply',{replyToId:message.id})).ok);const reply=(await api.roomSnapshot(id,'member')).messages.at(-1);
assert((await send('relixcore-general','Cross room',{replyToId:message.id})).error);
await api.markChatRead(id,reply.seq);await api.markChatRead(id,message.seq);assert.equal((await db.chatMember.findUnique({where:{roomId_userId:{roomId:id,userId:'member'}}})).lastReadSeq,reply.seq);
assert((await api.removeMessage(message.id)).error);
as('admin');assert((await api.removeMessage(message.id)).ok);snap=await api.roomSnapshot(id,'member');assert.equal(snap.messages[0].body,'Message removed');assert.equal(snap.messages[0].driveUrl,null);assert.equal(snap.messages[1].replyTo.body,'Message removed');
await api.changeGroupMember(id,'member',false);as('member');assert((await send(id,'Removed')).error);assert.equal(await api.roomSnapshot(id,'member'),null);
as(null);assert((await send('relixcore-general','Anonymous')).error);
console.log('PASS: group isolation, send authorization, mentions, Drive URL validation, replies, unread counts, monotonic read markers, moderation, member removal and anonymous rejection.');
const encrypted=api.seal('test-refresh');assert.equal(api.unseal(encrypted),'test-refresh');assert.throws(()=>api.unseal(encrypted.slice(2)));await db.driveConnection.create({data:{userId:'admin',email:'admin@test.invalid',refreshToken:encrypted}});
const watch=await db.driveWatch.create({data:{connectionId:'admin',roomId:id,folderId:'fixtureFolder123',folderName:'Test folder'}});
let files=[{id:'file1',name:'First.mp4',mimeType:'video/mp4',modifiedTime:'2026-11-09T00:00:00Z',parents:['fixtureFolder123']}],fail=false;
const originalFetch=global.fetch;global.fetch=async url=>{
if(String(url).includes('oauth2.googleapis.com'))return Response.json({access_token:'fixture'});
if(fail)return new Response('Denied',{status:403});
if(String(url).includes('/files/'))return Response.json({id:'fixtureFolder123',name:'Test folder',mimeType:'application/vnd.google-apps.folder',trashed:false});
return Response.json({files});};
const count=()=>db.chatMessage.count({where:{roomId:id,authorName:'Google Drive'}});
await api.syncWatch(watch.id);assert.equal(await count(),0);files=[{...files[0],name:'Final.mp4'}];await api.syncWatch(watch.id);assert.equal(await count(),1);await api.syncWatch(watch.id);assert.equal(await count(),1);
fail=true;await api.syncWatch(watch.id);assert.equal(await count(),1);assert((await db.driveWatch.findUnique({where:{id:watch.id}})).lastError);
fail=false;files=[];await api.syncWatch(watch.id);assert.equal(await count(),2);
global.fetch=originalFetch;
await db.user.delete({where:{id:'admin'}});assert.equal(await db.driveWatch.count(),0);assert.equal((await db.chatMessage.findUnique({where:{id:message.id}})).authorName,'Admin');
console.log('PASS: token encryption/tamper rejection, baseline, change alert, deduplication, failed-scan preservation, removal alert and user-deletion cascades.');
}finally{await db.$disconnect();await server.stop();await memory.close()}
})().catch(e=>{console.error(e);process.exit(1)});
