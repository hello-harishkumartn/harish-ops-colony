// Harish Ops Colony — loads exact source fragments then runs as ES module
const parts = await Promise.all(
  [0, 1, 2].map((i) =>
    fetch(new URL(`./colony.part${i}.js`, import.meta.url)).then((r) => {
      if (!r.ok) throw new Error(`colony.part${i}.js ${r.status}`);
      return r.text();
    })
  )
);
const blob = new Blob([parts.join('')], { type: 'text/javascript' });
await import(/* @vite-ignore */ URL.createObjectURL(blob));
