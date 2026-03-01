/**
 * Service d'aspiration email pour candidatures
 * Lit la boîte mail IMAP et crée une candidature pour chaque email reçu avec CV
 */
const Imap = require('node-imap');
const { simpleParser } = require('mailparser');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { Candidate, CandidateHistory } = require('../models');

const UPLOAD_DIR = '/app/uploads';

/**
 * Extraction basique nom/prénom depuis le texte du CV
 * Recherche les patterns courants dans un CV français
 */
function extractNameFromText(text) {
  if (!text) return { firstName: null, lastName: null };

  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // Stratégie 1 : Première ligne non vide est souvent le nom
  // Pattern typique : DUPONT Jean ou Jean DUPONT
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const line = lines[i];

    // Ignorer les lignes qui ressemblent à un titre
    if (/^(curriculum|cv|resume|lettre|objet|madame|monsieur)/i.test(line)) continue;

    // Pattern NOM PRÉNOM (NOM en majuscules)
    const matchUpper = line.match(/^([A-ZÀ-Ü]{2,})\s+([A-ZÀ-Üa-zà-ü-]+)$/);
    if (matchUpper) {
      return { lastName: matchUpper[1], firstName: matchUpper[2] };
    }

    // Pattern Prénom NOM
    const matchMixed = line.match(/^([A-ZÀ-Ü][a-zà-ü-]+)\s+([A-ZÀ-Ü]{2,})$/);
    if (matchMixed) {
      return { firstName: matchMixed[1], lastName: matchMixed[2] };
    }

    // Pattern Prénom Nom (deux mots capitalisés)
    const matchCapital = line.match(/^([A-ZÀ-Ü][a-zà-ü-]+)\s+([A-ZÀ-Ü][a-zà-ü-]+)$/);
    if (matchCapital) {
      return { firstName: matchCapital[1], lastName: matchCapital[2] };
    }
  }

  // Stratégie 2 : Chercher "Nom:" ou "Prénom:" dans le texte
  const nameMatch = text.match(/(?:nom\s*[:=]\s*)([A-ZÀ-Üa-zà-ü-]+)/i);
  const firstNameMatch = text.match(/(?:pr[eé]nom\s*[:=]\s*)([A-ZÀ-Üa-zà-ü-]+)/i);

  return {
    firstName: firstNameMatch ? firstNameMatch[1] : null,
    lastName: nameMatch ? nameMatch[1] : null
  };
}

/**
 * Extraction nom/prénom depuis l'adresse email de l'expéditeur
 */
function extractNameFromEmail(fromAddress) {
  if (!fromAddress) return { firstName: null, lastName: null };

  // Si un nom est fourni dans le champ "from"
  if (fromAddress.name) {
    const parts = fromAddress.name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
    }
    return { firstName: parts[0], lastName: null };
  }

  // Extraire depuis l'adresse email (ex: jean.dupont@mail.com)
  const emailMatch = fromAddress.address?.match(/^([a-z]+)[._-]([a-z]+)@/i);
  if (emailMatch) {
    return {
      firstName: emailMatch[1].charAt(0).toUpperCase() + emailMatch[1].slice(1),
      lastName: emailMatch[2].charAt(0).toUpperCase() + emailMatch[2].slice(1)
    };
  }

  return { firstName: null, lastName: null };
}

/**
 * Sauvegarde une pièce jointe sur le disque
 */
function saveAttachment(attachment) {
  const ext = path.extname(attachment.filename || '.pdf').toLowerCase();
  const filename = `cv_${uuidv4()}${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);

  fs.writeFileSync(filepath, attachment.content);

  return { filepath, filename, originalName: attachment.filename };
}

/**
 * Traite un email et crée une candidature
 */
async function processEmail(parsed) {
  const messageId = parsed.messageId;

  // Vérifier si ce mail a déjà été traité
  const existing = await Candidate.findOne({ where: { sourceEmailId: messageId } });
  if (existing) {
    console.log(`Email déjà traité: ${messageId}`);
    return null;
  }

  // Chercher les pièces jointes CV
  const cvAttachments = (parsed.attachments || []).filter(att => {
    const ext = path.extname(att.filename || '').toLowerCase();
    return ['.pdf', '.doc', '.docx', '.odt'].includes(ext);
  });

  if (cvAttachments.length === 0) {
    console.log(`Aucun CV trouvé dans l'email: ${messageId}`);
    return null;
  }

  // Sauvegarder le premier CV trouvé
  const savedCv = saveAttachment(cvAttachments[0]);

  // Tenter d'extraire le nom
  let { firstName, lastName } = extractNameFromEmail(parsed.from?.value?.[0]);

  // Si extraction email insuffisante, tenter depuis le texte du mail
  if (!firstName || !lastName) {
    const textExtraction = extractNameFromText(parsed.text || parsed.subject || '');
    if (!firstName) firstName = textExtraction.firstName;
    if (!lastName) lastName = textExtraction.lastName;
  }

  // Créer la candidature
  const candidate = await Candidate.create({
    firstName: firstName || 'À compléter',
    lastName: lastName || 'À compléter',
    email: parsed.from?.value?.[0]?.address,
    applicationDate: parsed.date || new Date(),
    status: 'candidature_recue',
    cvFilePath: savedCv.filepath,
    cvOriginalName: savedCv.originalName,
    sourceEmailId: messageId,
    sourceEmailDate: parsed.date,
    comments: `Candidature reçue par email.\nObjet: ${parsed.subject || 'Sans objet'}`
  });

  // Historique
  await CandidateHistory.create({
    candidateId: candidate.id,
    fromStatus: null,
    toStatus: 'candidature_recue',
    comment: 'Candidature aspirée automatiquement depuis la boîte mail'
  });

  console.log(`Candidature créée: ${firstName} ${lastName} (${messageId})`);
  return candidate;
}

/**
 * Lance l'aspiration des emails
 */
function startEmailIngestion() {
  const config = {
    user: process.env.MAIL_USER,
    password: process.env.MAIL_PASSWORD,
    host: process.env.MAIL_HOST,
    port: parseInt(process.env.MAIL_PORT || '993'),
    tls: process.env.MAIL_TLS !== 'false',
    tlsOptions: { rejectUnauthorized: false }
  };

  if (!config.user || !config.host) {
    console.log('Configuration email non définie, aspiration désactivée');
    return null;
  }

  console.log(`Démarrage aspiration email: ${config.user}@${config.host}`);

  const imap = new Imap(config);

  function openInbox(cb) {
    imap.openBox('INBOX', false, cb);
  }

  imap.once('ready', () => {
    openInbox((err) => {
      if (err) {
        console.error('Erreur ouverture INBOX:', err);
        return;
      }

      // Chercher les mails non lus
      imap.search(['UNSEEN'], (err, results) => {
        if (err) {
          console.error('Erreur recherche mails:', err);
          return;
        }

        if (!results || results.length === 0) {
          console.log('Aucun nouveau mail');
          imap.end();
          return;
        }

        console.log(`${results.length} nouveau(x) mail(s) à traiter`);

        const fetch = imap.fetch(results, { bodies: '', markSeen: true });

        fetch.on('message', (msg) => {
          msg.on('body', (stream) => {
            simpleParser(stream, async (err, parsed) => {
              if (err) {
                console.error('Erreur parsing mail:', err);
                return;
              }
              try {
                await processEmail(parsed);
              } catch (e) {
                console.error('Erreur traitement mail:', e);
              }
            });
          });
        });

        fetch.once('end', () => {
          console.log('Traitement emails terminé');
          imap.end();
        });
      });
    });
  });

  imap.on('error', (err) => {
    console.error('Erreur IMAP:', err.message || err);
  });

  imap.connect();

  return imap;
}

/**
 * Planifie l'aspiration toutes les 5 minutes
 */
function scheduleEmailIngestion() {
  // Premier check immédiat
  startEmailIngestion();

  // Puis toutes les 5 minutes
  setInterval(() => {
    startEmailIngestion();
  }, 5 * 60 * 1000);
}

module.exports = {
  startEmailIngestion,
  scheduleEmailIngestion,
  extractNameFromText,
  extractNameFromEmail,
  processEmail
};
