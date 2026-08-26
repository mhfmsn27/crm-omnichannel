const fs = require('fs');
const lines = fs.readFileSync('src/pages/Broadcast/CreateCampaign.js', 'utf8').split('\n');
let d = 0;
for (let i = 936; i < 1466; i++) {
    const l = lines[i];
    const o = (l.match(/<div[\s>]/g) || []).length;
    const c = (l.match(/<\/div>/g) || []).length;
    d += o - c;
    if (o || c) {
        console.log((i + 1) + ': depth=' + d + ' +' + o + ' -' + c + ' | ' + l.trim().substring(0, 100));
    }
}
console.log('\nFinal div depth from step3:', d);
