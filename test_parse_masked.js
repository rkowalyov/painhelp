function normalizeMaskedString(masked) {
  return masked
    .replace(/%26/g, '&')
    .replace(/%25/g, '%')
    .replace(/%5E/gi, '^');
}

function parseMaskedId(masked) {
  if (!masked || typeof masked !== 'string') return null;
  const normalized = normalizeMaskedString(masked);
  const re = /^id:t_(7\d{3})&\/mUm%(\d{2})(\d+)(\d{2})\$rkw\$\^(\d{4})mdw$/;
  const m = normalized.match(re);
  if (!m) return null;
  const rand1 = Number(m[1]);
  const rnd2 = Number(m[2]);
  const id = m[3];
  const rnd3 = Number(m[4]);
  const rand4 = Number(m[5]);

  if (!(rand1 >= 7001 && rand1 <= 7999)) return null;
  if (!(rnd2 >= 11 && rnd2 <= 99)) return null;
  if (!/^\d+$/.test(id)) return null;
  if (!(rnd3 >= 11 && rnd3 <= 99)) return null;
  if (!(rand4 >= 2001 && rand4 <= 2999)) return null;

  return id;
}

const examples = [
  'id:t_7214&/mUm%901558380$rkw$^2303mdw',
  'id:t_7001&/mUm%111234511$rkw$^2001mdw',
  'id:t_7999&/mUm%991234999$rkw$^2999mdw',
  '15583',
  'invalidstring',
  'id:t_6999&/mUm%901234580$rkw$^2303mdw' // rand1 out of range
];

for (const s of examples) {
  console.log(s, '=>', parseMaskedId(s));
}

const rawSearch = '?id=id:t_7214&/mUm%901558380$rkw$^2303mdw';
const match = rawSearch.match(/[?&]id=(id:t_.*?mdw)(?:&|$)/);
console.log('rawSearch =>', match ? parseMaskedId(match[1]) : null);
