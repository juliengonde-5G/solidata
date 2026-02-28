const fs = require('fs');
const pdfParse = require('pdf-parse');

/**
 * Extraire nom et prénom d'un CV au format PDF
 * Stratégie : chercher les patterns courants dans les premières lignes du texte
 */
async function extractNameFromCV(filePath) {
  try {
    const buffer = fs.readFileSync(filePath);
    const data = await pdfParse(buffer);
    const text = data.text;

    return extractNameFromText(text);
  } catch (err) {
    console.error('CV parse error:', err.message);
    return { firstName: '', lastName: '' };
  }
}

function extractNameFromText(text) {
  if (!text) return { firstName: '', lastName: '' };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Stratégie 1 : La première ligne non-vide contient souvent le nom
  // Chercher une ligne avec 2-3 mots, majoritairement alphabétiques, en début de document
  for (let i = 0; i < Math.min(10, lines.length); i++) {
    const line = lines[i];

    // Ignorer les lignes trop longues (descriptions) ou trop courtes
    if (line.length > 50 || line.length < 3) continue;

    // Ignorer les lignes avec des caractères spéciaux typiques (email, téléphone, adresse)
    if (line.includes('@') || line.includes('http') || /\d{2,}/.test(line)) continue;
    if (/^(curriculum|cv|lettre|objet|madame|monsieur)/i.test(line)) continue;

    // Chercher un pattern "Prénom Nom" ou "NOM Prénom"
    const words = line.split(/\s+/).filter(w => /^[a-zA-ZÀ-ÿ'-]+$/.test(w));

    if (words.length >= 2 && words.length <= 4) {
      // Si le premier mot est tout en majuscules → c'est le NOM
      if (words[0] === words[0].toUpperCase() && words[0].length > 1) {
        return {
          lastName: words[0],
          firstName: words.slice(1).join(' ')
        };
      }
      // Sinon, Prénom NOM
      const lastWord = words[words.length - 1];
      if (lastWord === lastWord.toUpperCase() && lastWord.length > 1) {
        return {
          firstName: words.slice(0, -1).join(' '),
          lastName: lastWord
        };
      }
      // Par défaut : premier mot = prénom, reste = nom
      return {
        firstName: words[0],
        lastName: words.slice(1).join(' ')
      };
    }
  }

  // Stratégie 2 : Chercher des patterns "Nom :" ou "Prénom :"
  const namePatterns = [
    /(?:nom\s*(?:de famille)?\s*:\s*)([a-zA-ZÀ-ÿ'-]+)/i,
    /(?:prénom\s*:\s*)([a-zA-ZÀ-ÿ'-]+)/i
  ];

  let lastName = '';
  let firstName = '';

  for (const line of lines.slice(0, 20)) {
    const nomMatch = line.match(namePatterns[0]);
    const prenomMatch = line.match(namePatterns[1]);
    if (nomMatch) lastName = nomMatch[1];
    if (prenomMatch) firstName = prenomMatch[1];
  }

  return { firstName, lastName };
}

module.exports = { extractNameFromCV, extractNameFromText };
