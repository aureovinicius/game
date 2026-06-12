// Service worker — cache do app shell para jogar offline.
// Estratégia: cache-first para os arquivos do jogo; rede para o resto
// (ex.: chamadas ao Worker do Mestre nunca são cacheadas).
const CACHE = 'cronicas-copa-v21';
const ASSETS = [
  './',
  'index.html',
  'css/style.css',
  'manifest.webmanifest',
  'data/teams-2026.json',
  'data/narrativa.json',
  'data/nomes.json',
  'data/selecoes-i18n.json',
  'data/copas-historicas.json',
  'data/kits.json',
  'js/app.js',
  'js/audio.js',
  'js/config.js',
  'js/data.js',
  'js/dice.js',
  'js/engine.js',
  'js/mecanicas.js',
  'js/kits.js',
  'js/pitch.js',
  'js/flags.js',
  'js/perks.js',
  'js/rules.js',
  'js/state.js',
  'js/achievements.js',
  'js/mestre.js',
  'js/narrador.js',
  'js/ui/screens.js',
  'js/ui/dice-anim.js',
  'icons/icon.svg',
  // bandeiras (todas locais p/ funcionar offline)
  'flags/ALG.svg', 'flags/ARG.svg', 'flags/AUS.svg', 'flags/AUT.svg', 'flags/BEL.svg',
  'flags/BIH.svg', 'flags/BRA.svg', 'flags/BUL.svg', 'flags/CAN.svg', 'flags/CHN.svg',
  'flags/CIV.svg', 'flags/CMR.svg', 'flags/COD.svg', 'flags/COL.svg', 'flags/CPV.svg',
  'flags/CRC.svg', 'flags/CRO.svg', 'flags/CUW.svg', 'flags/CZE.svg', 'flags/DEN.svg',
  'flags/ECU.svg', 'flags/EGY.svg', 'flags/ENG.svg', 'flags/ESP.svg', 'flags/FRA.svg',
  'flags/GER.svg', 'flags/GHA.svg', 'flags/HAI.svg', 'flags/HUN.svg', 'flags/IRL.svg',
  'flags/IRN.svg', 'flags/IRQ.svg', 'flags/ISR.svg', 'flags/ITA.svg', 'flags/JOR.svg',
  'flags/JPN.svg', 'flags/KOR.svg', 'flags/KSA.svg', 'flags/MAR.svg', 'flags/MEX.svg',
  'flags/NED.svg', 'flags/NGA.svg', 'flags/NOR.svg', 'flags/NZL.svg', 'flags/PAN.svg',
  'flags/PAR.svg', 'flags/PER.svg', 'flags/POL.svg', 'flags/POR.svg', 'flags/QAT.svg',
  'flags/RFA.svg', 'flags/ROU.svg', 'flags/RSA.svg', 'flags/RUS.svg', 'flags/SCO.svg',
  'flags/SEN.svg', 'flags/SLV.svg', 'flags/SUI.svg', 'flags/SVN.svg', 'flags/SWE.svg',
  'flags/TCH.svg', 'flags/TUN.svg', 'flags/TUR.svg', 'flags/URS.svg', 'flags/URU.svg',
  'flags/URY.svg', 'flags/USA.svg', 'flags/UZB.svg', 'flags/YUG.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  // só lida com GET de mesma origem (app shell). O resto vai direto pra rede.
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(e.request).then((hit) => hit || fetch(e.request).then((resp) => {
      const copy = resp.clone();
      caches.open(CACHE).then((c) => c.put(e.request, copy)).catch(() => {});
      return resp;
    }).catch(() => caches.match('index.html')))
  );
});
