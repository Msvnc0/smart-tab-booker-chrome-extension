const fs = require('fs');

function validateKeys() {
    const en = JSON.parse(fs.readFileSync('_locales/en/messages.json'));
    const tr = JSON.parse(fs.readFileSync('_locales/tr/messages.json'));
    const enK = Object.keys(en);
    const trK = Object.keys(tr);
    const missing = trK.filter(k => !enK.includes(k));
    const extra = enK.filter(k => !trK.includes(k));
    if (missing.length) console.log("Missing in TR:", missing.join(", "));
    if (extra.length) console.log("Extra in EN:", extra.join(", "));
    if (!missing.length && !extra.length) console.log("Keys match:", enK.length, "TR:", trK.length);
}

validateKeys();
