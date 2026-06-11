// Gera data/nomes.json (22 nomes por seleção, por idioma/cultura) e
// data/selecoes-i18n.json (nomes das seleções localizados, pronto p/ i18n).
// Uso: node scripts/gen-nomes.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = resolve(__dirname, '..', 'data');
const teams = JSON.parse(readFileSync(resolve(dataDir, 'teams-2026.json'), 'utf8')).teams;

// RNG semeável (mulberry32) — nomes reproduzíveis por seleção.
function rngDe(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Cultura/idioma de cada seleção (por TLA).
const CULTURA = {
  CZE: 'slav', MEX: 'es', RSA: 'en', KOR: 'ko', BIH: 'slav', CAN: 'en', QAT: 'ar',
  SUI: 'de', BRA: 'pt', HAI: 'fr', MAR: 'ar', SCO: 'en', AUS: 'en', PAR: 'es',
  TUR: 'tr', USA: 'en', CUW: 'nl', ECU: 'es', GER: 'de', CIV: 'fr', JPN: 'ja',
  NED: 'nl', SWE: 'nord', TUN: 'ar', BEL: 'nl', EGY: 'ar', IRN: 'fa', NZL: 'en',
  CPV: 'pt', KSA: 'ar', ESP: 'es', URY: 'es', FRA: 'fr', IRQ: 'ar', NOR: 'nord',
  SEN: 'fr', ALG: 'ar', ARG: 'es', AUT: 'de', JOR: 'ar', COL: 'es', COD: 'fr',
  POR: 'pt', UZB: 'tr', CRO: 'slav', ENG: 'en', GHA: 'en', PAN: 'es',
};

// Nomes das seleções em pt-BR (estrutura por idioma p/ adicionar outros depois).
const I18N = {
  'pt-BR': {
    CZE: 'Tchéquia', MEX: 'México', RSA: 'África do Sul', KOR: 'Coreia do Sul',
    BIH: 'Bósnia e Herzegovina', CAN: 'Canadá', QAT: 'Catar', SUI: 'Suíça',
    BRA: 'Brasil', HAI: 'Haiti', MAR: 'Marrocos', SCO: 'Escócia', AUS: 'Austrália',
    PAR: 'Paraguai', TUR: 'Turquia', USA: 'Estados Unidos', CUW: 'Curaçao',
    ECU: 'Equador', GER: 'Alemanha', CIV: 'Costa do Marfim', JPN: 'Japão',
    NED: 'Países Baixos', SWE: 'Suécia', TUN: 'Tunísia', BEL: 'Bélgica',
    EGY: 'Egito', IRN: 'Irã', NZL: 'Nova Zelândia', CPV: 'Cabo Verde',
    KSA: 'Arábia Saudita', ESP: 'Espanha', URY: 'Uruguai', FRA: 'França',
    IRQ: 'Iraque', NOR: 'Noruega', SEN: 'Senegal', ALG: 'Argélia', ARG: 'Argentina',
    AUT: 'Áustria', JOR: 'Jordânia', COL: 'Colômbia', COD: 'RD Congo',
    POR: 'Portugal', UZB: 'Uzbequistão', CRO: 'Croácia', ENG: 'Inglaterra',
    GHA: 'Gana', PAN: 'Panamá',
  },
};

// Pools de nomes por cultura (prenome + sobrenome).
const P = {
  pt: {
    first: ['João', 'Pedro', 'Lucas', 'Gabriel', 'Matheus', 'Rafael', 'Bruno', 'Diego', 'Thiago', 'Felipe', 'Rodrigo', 'André', 'Vinícius', 'Caio', 'Gustavo', 'Leonardo', 'Carlos', 'Paulo', 'Ricardo', 'Marcelo'],
    last: ['Silva', 'Santos', 'Oliveira', 'Souza', 'Pereira', 'Costa', 'Almeida', 'Ferreira', 'Rodrigues', 'Gomes', 'Martins', 'Araújo', 'Ribeiro', 'Carvalho', 'Barbosa', 'Cardoso', 'Nascimento', 'Moreira', 'Lima', 'Fernandes'],
  },
  es: {
    first: ['Juan', 'Carlos', 'José', 'Luis', 'Diego', 'Sergio', 'Javier', 'Andrés', 'Fernando', 'Miguel', 'Gonzalo', 'Rodrigo', 'Santiago', 'Mateo', 'Alejandro', 'Pablo', 'Iván', 'Marcos', 'Nicolás', 'Lucas'],
    last: ['García', 'Martínez', 'Rodríguez', 'López', 'González', 'Pérez', 'Sánchez', 'Ramírez', 'Torres', 'Flores', 'Gómez', 'Díaz', 'Vázquez', 'Castro', 'Romero', 'Herrera', 'Morales', 'Ortiz', 'Acosta', 'Rojas'],
  },
  en: {
    first: ['James', 'Jack', 'Harry', 'George', 'Oliver', 'Jacob', 'Thomas', 'William', 'Daniel', 'Michael', 'Ryan', 'Connor', 'Liam', 'Aaron', 'Kyle', 'Lewis', 'Callum', 'Scott', 'Nathan', 'Mason'],
    last: ['Smith', 'Jones', 'Brown', 'Williams', 'Taylor', 'Davies', 'Wilson', 'Evans', 'Roberts', 'Walker', 'Wright', 'Thompson', 'Robinson', 'Campbell', 'Stewart', 'Murray', 'Clarke', 'Hughes', 'Anderson', 'Bennett'],
  },
  de: {
    first: ['Lukas', 'Leon', 'Felix', 'Maximilian', 'Jonas', 'Niklas', 'Tim', 'Florian', 'Sebastian', 'Tobias', 'Julian', 'Marcel', 'Dennis', 'Philipp', 'Stefan', 'Thomas', 'Christian', 'Andreas', 'Daniel', 'Markus'],
    last: ['Müller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Meyer', 'Wagner', 'Becker', 'Hoffmann', 'Schäfer', 'Koch', 'Bauer', 'Richter', 'Klein', 'Wolf', 'Schröder', 'Neumann', 'Braun', 'Zimmermann', 'Krüger'],
  },
  fr: {
    first: ['Lucas', 'Hugo', 'Théo', 'Nathan', 'Antoine', 'Maxime', 'Alexandre', 'Clément', 'Julien', 'Romain', 'Florian', 'Enzo', 'Kylian', 'Adrien', 'Baptiste', 'Quentin', 'Pierre', 'Louis', 'Mathis', 'Yanis'],
    last: ['Martin', 'Bernard', 'Dubois', 'Robert', 'Richard', 'Petit', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Michel', 'Garcia', 'Roux', 'Fontaine', 'Mercier', 'Girard', 'Bonnet', 'Diallo'],
  },
  nl: {
    first: ['Daan', 'Sem', 'Bram', 'Lars', 'Thijs', 'Ruben', 'Jeroen', 'Bas', 'Tim', 'Stijn', 'Niels', 'Joost', 'Sven', 'Koen', 'Maarten', 'Jasper', 'Wout', 'Dirk', 'Rik', 'Teun'],
    last: ['De Jong', 'Jansen', 'De Vries', 'Van den Berg', 'Van Dijk', 'Bakker', 'Janssen', 'Visser', 'Smit', 'Meijer', 'De Boer', 'Mulder', 'Bos', 'Vos', 'Peters', 'Hendriks', 'Van Leeuwen', 'Dekker', 'Brouwer', 'De Wit'],
  },
  ar: {
    first: ['Mohamed', 'Ahmed', 'Ali', 'Omar', 'Youssef', 'Khaled', 'Hassan', 'Hussein', 'Karim', 'Tarek', 'Mahmoud', 'Saad', 'Faisal', 'Abdullah', 'Ibrahim', 'Yassine', 'Bilal', 'Walid', 'Sami', 'Nabil'],
    last: ['Al-Said', 'Mansour', 'Haddad', 'Nasser', 'El-Sayed', 'Boutaib', 'Ziani', 'Khalil', 'Al-Dosari', 'Bouazza', 'Ben Ali', 'Saleh', 'Mostafa', 'Al-Harbi', 'Ghanem', 'Rashid', 'Amrani', 'Trabelsi', 'Belhadj', 'Mahrez'],
  },
  tr: {
    first: ['Mehmet', 'Mustafa', 'Emre', 'Burak', 'Hakan', 'Yusuf', 'Arda', 'Ozan', 'Cenk', 'Kerem', 'Volkan', 'Serkan', 'Ahmet', 'Tolga', 'Caner', 'Umut', 'Berkay', 'Furkan', 'Eren', 'Okan'],
    last: ['Yılmaz', 'Demir', 'Şahin', 'Çelik', 'Yıldız', 'Kaya', 'Öztürk', 'Aydın', 'Arslan', 'Doğan', 'Korkmaz', 'Çakır', 'Aktaş', 'Erdoğan', 'Koç', 'Kurt', 'Şimşek', 'Polat', 'Aslan', 'Taş'],
  },
  fa: {
    first: ['Alireza', 'Mehdi', 'Reza', 'Sardar', 'Ali', 'Karim', 'Saman', 'Vahid', 'Ehsan', 'Omid', 'Milad', 'Ashkan', 'Hossein', 'Morteza', 'Ramin', 'Saeid', 'Kaveh', 'Farshad', 'Amir', 'Javad'],
    last: ['Azmoun', 'Jahanbakhsh', 'Hajsafi', 'Taremi', 'Ansarifard', 'Rezaei', 'Karimi', 'Pouraliganji', 'Cheshmi', 'Ezatolahi', 'Mohammadi', 'Beiranvand', 'Noorollahi', 'Gholizadeh', 'Ahmadi', 'Sadeghi', 'Hosseini', 'Moharrami', 'Ghoddos', 'Torabi'],
  },
  ja: {
    first: ['Sho', 'Takumi', 'Yuto', 'Daichi', 'Ren', 'Hiroki', 'Kaoru', 'Takefusa', 'Wataru', 'Ritsu', 'Genki', 'Kaito', 'Sota', 'Yuki', 'Haruki', 'Kenta', 'Riku', 'Daiki', 'Yuya', 'Shota'],
    last: ['Tanaka', 'Suzuki', 'Sato', 'Watanabe', 'Ito', 'Yamamoto', 'Nakamura', 'Kobayashi', 'Kato', 'Yoshida', 'Yamada', 'Sasaki', 'Endo', 'Mitoma', 'Kubo', 'Minamino', 'Tomiyasu', 'Doan', 'Morita', 'Nakata'],
  },
  ko: {
    first: ['Min-jae', 'Heung-min', 'Hee-chan', 'Woo-young', 'Jae-sung', 'Seung-ho', 'In-beom', 'Chang-hoon', 'Ui-jo', 'Young-gwon', 'Ji-sung', 'Sung-yueng', 'Tae-hwan', 'Kang-in', 'Gyu-sung', 'Moon-hwan', 'Jin-su', 'Dong-jun', 'Hyun-woo', 'Seung-gyu'],
    last: ['Kim', 'Lee', 'Park', 'Choi', 'Jung', 'Kang', 'Cho', 'Yoon', 'Jang', 'Lim', 'Han', 'Oh', 'Seo', 'Shin', 'Kwon', 'Hwang', 'Ahn', 'Song', 'Hong', 'Bae'],
  },
  slav: {
    first: ['Luka', 'Marko', 'Ivan', 'Josip', 'Mateo', 'Tomáš', 'Jakub', 'Petr', 'Martin', 'David', 'Filip', 'Matěj', 'Ante', 'Domagoj', 'Nikola', 'Stjepan', 'Dejan', 'Vlatko', 'Bruno', 'Ondřej'],
    last: ['Novák', 'Svoboda', 'Modrić', 'Kovačić', 'Perišić', 'Horák', 'Novotný', 'Procházka', 'Dvořák', 'Kovač', 'Babić', 'Marić', 'Jurić', 'Knežević', 'Pavlović', 'Vlašić', 'Černý', 'Veselý', 'Brozović', 'Lovren'],
  },
  nord: {
    first: ['Erik', 'Viktor', 'Emil', 'Oscar', 'Anton', 'Gustav', 'Filip', 'Albin', 'Hugo', 'Magnus', 'Henrik', 'Martin', 'Mikael', 'Jonas', 'Kristian', 'Sander', 'Mathias', 'Andreas', 'Sebastian', 'Markus'],
    last: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson', 'Hansen', 'Johansen', 'Olsen', 'Larsen', 'Andersen', 'Berg', 'Haaland', 'Ødegaard', 'Sørensen', 'Berge'],
  },
};

function gerarNomes(team) {
  const cult = CULTURA[team.tla] || 'en';
  const pool = P[cult] || P.en;
  const rng = rngDe(team.id || 1);
  const usados = new Set();
  const nomes = [];
  let tentativas = 0;
  while (nomes.length < 22 && tentativas < 2000) {
    tentativas++;
    const f = pool.first[Math.floor(rng() * pool.first.length)];
    const l = pool.last[Math.floor(rng() * pool.last.length)];
    const nome = `${f} ${l}`;
    if (!usados.has(nome)) { usados.add(nome); nomes.push(nome); }
  }
  return nomes;
}

const nomes = {};
for (const t of teams) nomes[t.id] = gerarNomes(t);

writeFileSync(resolve(dataDir, 'nomes.json'), JSON.stringify(nomes) + '\n');
writeFileSync(resolve(dataDir, 'selecoes-i18n.json'), JSON.stringify(I18N, null, 2) + '\n');

const totalNomes = Object.values(nomes).reduce((a, n) => a + n.length, 0);
const todos22 = Object.values(nomes).every((n) => n.length === 22);
const semCultura = teams.filter((t) => !CULTURA[t.tla]).map((t) => t.tla);
const semI18n = teams.filter((t) => !I18N['pt-BR'][t.tla]).map((t) => t.tla);
console.log(`nomes.json: ${Object.keys(nomes).length} seleções, ${totalNomes} nomes, todas com 22 = ${todos22}`);
console.log(`sem cultura: ${semCultura.join(', ') || 'nenhuma'} | sem i18n pt-BR: ${semI18n.join(', ') || 'nenhuma'}`);
console.log('exemplos:');
for (const tla of ['BRA', 'JPN', 'KSA', 'ENG', 'KOR', 'CRO']) {
  const t = teams.find((x) => x.tla === tla);
  console.log(`  ${tla}:`, nomes[t.id].slice(0, 4).join(', '), '…');
}
