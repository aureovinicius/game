// Bandeiras das seleções, em SVG LOCAL (offline) — nunca emoji (emoji de
// bandeira não renderiza no Windows). Cada seleção tem flags/<TLA>.svg, então
// tudo funciona sem internet (os arquivos entram no cache do service worker).
// Atuais: extraídas do pacote flag-icons. Estados extintos (RFA, TCH, URS,
// YUG): SVGs desenhados à mão.
//
//   bandeira(time) -> 'flags/<TLA>.svg', ou null se não houver bandeira.

// Conjunto de TLAs com arquivo de bandeira em flags/.
const TEM = new Set([
  'ALG', 'ARG', 'AUS', 'AUT', 'BEL', 'BIH', 'BRA', 'BUL', 'CAN', 'CHN', 'CIV',
  'CMR', 'COD', 'COL', 'CPV', 'CRC', 'CRO', 'CUW', 'CZE', 'DEN', 'ECU', 'EGY',
  'ENG', 'ESP', 'FRA', 'GER', 'GHA', 'HAI', 'HUN', 'IRL', 'IRN', 'IRQ', 'ISR',
  'ITA', 'JOR', 'JPN', 'KOR', 'KSA', 'MAR', 'MEX', 'NED', 'NGA', 'NOR', 'NZL',
  'PAN', 'PAR', 'PER', 'POL', 'POR', 'QAT', 'ROU', 'RSA', 'RUS', 'SCO', 'SEN',
  'SLV', 'SUI', 'SVN', 'SWE', 'TUN', 'TUR', 'URU', 'URY', 'USA', 'UZB',
  // Estados extintos (SVG local desenhado à mão)
  'RFA', 'TCH', 'URS', 'YUG',
]);

export function bandeira(time) {
  const tla = time && time.tla;
  return tla && TEM.has(tla) ? `flags/${tla}.svg` : null;
}

// Lista usada pelo service worker para pré-cachear todas as bandeiras.
export const TODAS_AS_BANDEIRAS = [...TEM].map((tla) => `flags/${tla}.svg`);
