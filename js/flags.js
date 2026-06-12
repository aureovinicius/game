// Bandeiras das seleções, em SVG (nunca emoji — emoji de bandeira não
// renderiza no Windows). Para as nações atuais usa o pacote flag-icons via
// CDN (mesma estratégia dos escudos modernos, que também são URLs); para os
// Estados extintos (Alemanha Ocidental, Tchecoslováquia, URSS, Iugoslávia)
// usa SVGs locais em flags/ (vão pro cache offline).
//
//   bandeira(time) -> URL do SVG da bandeira, ou null se não houver TLA.

// TLA (código FIFA) -> código ISO/flag-icons.
const ISO = {
  ALG: 'dz', ARG: 'ar', AUS: 'au', AUT: 'at', BEL: 'be', BIH: 'ba', BRA: 'br',
  BUL: 'bg', CAN: 'ca', CHN: 'cn', CIV: 'ci', CMR: 'cm', COD: 'cd', COL: 'co',
  CPV: 'cv', CRC: 'cr', CRO: 'hr', CUW: 'cw', CZE: 'cz', DEN: 'dk', ECU: 'ec',
  EGY: 'eg', ENG: 'gb-eng', ESP: 'es', FRA: 'fr', GER: 'de', GHA: 'gh', HAI: 'ht',
  HUN: 'hu', IRL: 'ie', IRN: 'ir', IRQ: 'iq', ISR: 'il', ITA: 'it', JOR: 'jo',
  JPN: 'jp', KOR: 'kr', KSA: 'sa', MAR: 'ma', MEX: 'mx', NED: 'nl', NGA: 'ng',
  NOR: 'no', NZL: 'nz', PAN: 'pa', PAR: 'py', PER: 'pe', POL: 'pl', POR: 'pt',
  QAT: 'qa', ROU: 'ro', RSA: 'za', RUS: 'ru', SCO: 'gb-sct', SEN: 'sn', SLV: 'sv',
  SUI: 'ch', SVN: 'si', SWE: 'se', TUN: 'tn', TUR: 'tr', URU: 'uy', URY: 'uy',
  USA: 'us', UZB: 'uz',
};

// Estados extintos: bandeira SVG local.
const LOCAIS = new Set(['RFA', 'TCH', 'URS', 'YUG']);

const CDN = 'https://cdn.jsdelivr.net/npm/flag-icons@7/flags/4x3/';

export function bandeira(time) {
  const tla = time && time.tla;
  if (!tla) return null;
  if (LOCAIS.has(tla)) return `flags/${tla}.svg`;
  const iso = ISO[tla];
  return iso ? `${CDN}${iso}.svg` : null;
}
