/* GitHub Pages loader */
const n = 4;
const texts = [];
for (let i = 0; i < n; i++) {
  const r = await fetch('./colony.part' + i + '.js?v=3');
  if (!r.ok) throw new Error('Missing colony.part' + i + '.js');
  texts.push(await r.text());
}
const url = URL.createObjectURL(new Blob([texts.join('')], { type: 'text/javascript' }));
await import(url);
