// Temporary: load full colony from live tunnel until monolithic push completes.
// Prefer same-origin parts when present.
async function load() {
  const tryUrls = [
    ['./colony.part0.js', './colony.part1.js', './colony.part2.js'],
  ];
  try {
    const parts = await Promise.all(
      tryUrls[0].map((u) =>
        fetch(new URL(u, import.meta.url)).then(async (r) => {
          if (!r.ok) throw new Error(u + ' ' + r.status);
          const t = await r.text();
          if (t.trim() === 'PLACEHOLDER' || t.length < 100) throw new Error('bad part');
          return t;
        })
      )
    );
    const blob = new Blob([parts.join('')], { type: 'text/javascript' });
    await import(/* @vite-ignore */ URL.createObjectURL(blob));
    return;
  } catch (e) {
    console.warn('parts load failed, using tunnel fallback', e);
  }
  const code = await fetch('https://estimates-latinas-spread-written.trycloudflare.com/colony.js').then((r) => {
    if (!r.ok) throw new Error('tunnel ' + r.status);
    return r.text();
  });
  const blob = new Blob([code], { type: 'text/javascript' });
  await import(/* @vite-ignore */ URL.createObjectURL(blob));
}
await load();
