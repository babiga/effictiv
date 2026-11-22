import {visit} from "./browser.mjs";
const chunks=[];
for await (const chunk of process.stdin) chunks.push(chunk);
const {scenario,audit}=JSON.parse(Buffer.concat(chunks));
process.stdout.write(JSON.stringify(await visit(scenario,audit)));
