import type { HandbookContent } from './ai';

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

/** Normalise text for matching (remove accents, lowercase, collapse spaces) */
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

/** Strip noise from a string. VERY aggressive to avoid "Valide a certidão" etc. */
const cleanNoiseFromLine = (line: string): string => {
  return line
    .replace(/p[áa]gina:?\s*\d+(?:\/\d+)?/gi, '') // "Pagina: 001/019"
    .replace(/valide\s+a\s+certid[ãa]o/gi, '') // "Valide a certidão"
    .replace(/clicando\s+no\s+link\s+a\s+seguir[:.]?/gi, '') // "clicando no link a seguir:"
    .replace(/https?:\/\/[^\s]+/gi, '') // Any URLs
    .replace(/[a-f0-9]{20,}/gi, '') // Any long hex hashes
    .replace(/assinador-web|onr\.org\.br|selo\s+digital/gi, '') // Metadata
    .replace(/certific[oa]\s+que\s+a\s+presente\s+foi\s+extra[íi]da/gi, '') // Cert metadata
    .replace(/valide\s+aqui/gi, '') // "Valide aqui"
    .replace(/\s+/g, ' ')
    .trim();
};

/** Split text into paragraphs and clean them */
const toParagraphs = (text: string): string[] => {
  const lines = text.split('\n');
  const cleanedLines = lines.map(cleanNoiseFromLine);
  
  const cleanedText = cleanedLines.join('\n');
  return cleanedText
    .split(/\n{2,}|\r\n{2,}/)
    .map(p => p.replace(/\s+/g, ' ').trim())
    // Ensure the paragraph actually has real content (letters) and isn't just noise or a very short fragment
    .filter(p => p.length > 20 && /[a-zA-Z]{3,}/.test(p)); 
};

/** Return paragraphs that contain at least one keyword, but avoid picking "CONVENCAO:" fragments alone */
const findRelevant = (paragraphs: string[], keywords: string[], maxParas = 4): string[] => {
  const matched: string[] = [];
  const seen = new Set<string>();

  for (const para of paragraphs) {
    if (matched.length >= maxParas) break;
    const n = norm(para);
    // Ignore meta-headers often found at start of extractions
    if (n.startsWith('convencao') && n.length < 15) continue;
    if (n.startsWith('atas') && n.length < 10) continue;

    if (keywords.some(k => n.includes(k))) {
      const snippet = n.substring(0, 40);
      if (!seen.has(snippet)) {
        seen.add(snippet);
        matched.push(para.trim());
      }
    }
  }
  return matched;
};

// ---------------------------------------------------------------------------
// Advanced Rule-Based Humanizer (Simulated AI)
// ---------------------------------------------------------------------------

/** Rewrites extracted rules into premium, friendly "Agent" content */
const humanizeRule = (extractedText: string): string => {
  // If no text was extracted, we return the premium fallback
  if (!extractedText || extractedText.length < 10) return ''; 

  // Clean the text from legal markers
  let text = extractedText
    .replace(/artigo\s+\d+[º°]?\.?\s*/gi, '')
    .replace(/§\s*\d+[º°]?\s*/g, '')
    .replace(/inciso\s+[A-Z0-9]+\s*/gi, '')
    .replace(/par[áa]grafo\s+[úu]nico[:.]?\s*/gi, '')
    .replace(/([a-z])\)(\s)/gi, '$2')
    .replace(/\s+/g, ' ')
    .trim();

  // If the paragraph is very long, shorten it to the first few sentences
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-ZÀ-ÿ])/);
  if (sentences.length > 4) text = sentences.slice(0, 4).join(' ');

  // Mapping to friendly voice
  const voiceMap: [RegExp, string][] = [
    [/fica\s+proibido/gi, 'Não é permitido'],
    [/é\s+obrigat[óo]rio/gi, 'Lembre-se que é necessário'],
    [/sujeitar-[áase]\s+[àa]\s+multa/gi, 'está sujeito a advertência ou multa'],
    [/dever[áa]\s+ser/gi, 'deve ser'],
    [/com\s+anteced[êe]ncia\s+m[íi]nima\s+de/gi, 'com pelo menos'],
    [/o\s+cond[ôo]mino/gi, 'o morador'],
    [/os\s+moradores/gi, 'todos'],
    [/proibida\s+a\s+entrada/gi, 'não é permitida a entrada'],
  ];

  for (const [re, rep] of voiceMap) text = text.replace(re, rep);

  // Final cleanup: remove trailing punctuations that don't make sense after cleaning URLs
  text = text.replace(/[:;]\s*$/g, '.');

  return text.charAt(0).toUpperCase() + text.slice(1);
};

// ---------------------------------------------------------------------------
// Main Logic
// ---------------------------------------------------------------------------

const RULES_DB = [
  {
    id: 'acesso',
    title: 'Acesso e Cadastro de Moradores',
    keywords: ['acesso', 'cadastro', 'portaria', 'visitante', 'prestador', 'biometria', 'qr code', 'chaveiro', 'interfone', 'morador', 'dependentes', 'inquilino', 'veiculo', 'placa'],
    intro: 'Para a segurança de todos, o acesso ao condomínio segue as seguintes regras extraídas:',
    fallback: 'O acesso ao condomínio é realizado mediante cadastro prévio na administração. Visitantes e prestadores devem ser identificados e autorizados pelo morador na portaria 24h.',
  },
  {
    id: 'comunicacao',
    title: 'Canais de Comunicação',
    keywords: ['comunicacao', 'comunicado', 'e-mail', 'email', 'aplicativo', 'app', 'mural', 'assembleia', 'aviso', 'notificacao', 'circular', 'edital'],
    intro: 'Mantenha-se informado através dos nossos canais oficiais:',
    fallback: 'O condomínio comunica-se por e-mail, aplicativo e mural na portaria. Assembleias são convocadas com antecedência mínima por escrito ou e-mail.',
  },
  {
    id: 'pets',
    title: 'Animais de Estimação',
    keywords: ['animal', 'pet', 'caes', 'cao', 'cachorro', 'gato', 'guia', 'focinheira', 'dejetos', 'elevador de servico', 'vacina', 'ruido', 'perturbacao'],
    intro: 'Seu pet é bem-vindo, seguindo as normas da nossa convenção:',
    fallback: 'Animais de estimação devem circular nas áreas comuns sempre com guia curta e preferencialmente no colo. Utilize o elevador de serviço e lembre-se de recolher os dejetos imediatamente.',
  },
  {
    id: 'financas',
    title: 'Boletos e Questões Financeiras',
    keywords: ['faturamento', 'boleto', 'taxa condominial', 'vencimento', 'multa', 'juros', 'correcao', 'inadimplencia', 'rateio', 'prestacao de contas', 'orcamento'],
    intro: 'Informações sobre pagamentos e obrigações financeiras:',
    fallback: 'A taxa condominial vence mensalmente conforme indicado no boleto. Pagamentos em atraso geram multa de 2%, juros e correção. Consulte a administração para 2ª via.',
  },
  {
    id: 'documentos',
    title: 'Acesso a Documentos',
    keywords: ['documento', 'ata', 'convencao', 'regimento', 'contrato', 'prestacao', 'solicitacao', 'copia', 'arquivo'],
    intro: 'Você pode solicitar ou acessar os documentos oficiais do condomínio:',
    fallback: 'Convenção, Regimento Interno e atas de assembleias estão disponíveis para consulta dos moradores na administração ou pelo aplicativo.',
  },
  {
    id: 'mudancas',
    title: 'Regras para Mudanças',
    keywords: ['mudanca', 'mudança', 'entrada de movel', 'elevador de servico', 'agendamento', 'horario de mudanca', 'transferencia', 'protecao', 'manta'],
    intro: 'Ao planejar sua mudança, atente-se aos procedimentos oficiais:',
    fallback: 'Todas as mudanças devem ser agendadas com pelo menos 48h de antecedência junto à administração. Os horários permitidos são de segunda a sexta, das 08h às 17h, e sábados das 09h às 13h.',
  },
  {
    id: 'obras',
    title: 'Reformas e Obras',
    keywords: ['obra', 'reforma', 'ruido', 'barulho', 'art', 'rrt', 'entulho', 'horario de obra', 'engenheiro', 'arquiteto', 'projeto', 'marcenaria'],
    intro: 'Reformas em unidades privativas devem seguir as normas técnicas abaixo:',
    fallback: 'Obras e reformas exigem comunicação prévia. Reformas estruturais requerem ART/RRT de profissional habilitado. Ruídos permitidos apenas em horário comercial, de segunda a sexta.',
  },
  {
    id: 'lixo',
    title: 'Descarte e Coleta de Lixo',
    keywords: ['lixo', 'residuo', 'coleta', 'reciclavel', 'seletiva', 'lixeira', 'descarte', 'ensacado', 'organico', 'vidro', 'metal', 'plastico'],
    intro: 'A correta gestão de resíduos é dever de todos conforme nossas regras:',
    fallback: 'O lixo deve ser descartado ensacado nos coletores indicados. Realize a separação de materiais recicláveis (plástico, papel, metal, vidro) para coleta seletiva.',
  },
  {
    id: 'areas',
    title: 'Áreas Comuns e Reservas',
    keywords: ['area comum', 'salao de festas', 'churrasqueira', 'piscina', 'academia', 'reserva', 'festa', ' playground', 'brinquedoteca', 'quadra', 'jogos'],
    intro: 'As áreas de lazer e uso comum possuem as seguintes diretrizes:',
    fallback: 'As áreas comuns são para uso coletivo e devem ser reservadas pelo aplicativo. O condômino responsável pela reserva deve zelar pela limpeza e integridade do espaço.',
  },
  {
    id: 'silencio',
    title: 'Horário de Silêncio',
    keywords: ['silencio', 'barulho', 'ruido', 'vizinho', 'perturbar', 'sossego', 'horario de silencio', 'musica', 'gritaria', 'festas'],
    intro: 'Para uma convivência harmoniosa, observe os limites de ruído:',
    fallback: 'O horário de silêncio começa às 22h e vai até as 08h. Fora desse horário, o bom senso deve prevalecer para não perturbar o sossego dos vizinhos.',
  },
];

export const parseDocumentToHandbook = (rawText: string, logoUrl?: string): HandbookContent => {
  const paragraphs = toParagraphs(rawText);
  
  // Condominium Name
  let title = 'Seu Condomínio';
  const linesForTitle = rawText.split('\n').map(l => cleanNoiseFromLine(l)).filter(l => l.length > 5);
  for (const line of linesForTitle.slice(0, 150)) {
    const m = line.match(/(?:condom[íi]nio|residencial|edif[ií]cio)\s+(.{5,50})/i);
    if (m && m[1]) {
      title = m[0].replace(/[,;.]/g, '').trim().replace(/\b\w/g, c => c.toUpperCase());
      break;
    }
  }

  // Contacts
  const contacts: { sector: string; info: string }[] = [];
  const phoneRe = /\(?\d{2}\)?\s*\d{4,5}[-\s]?\d{4}/g;
  const emailRe = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi;
  const seenInfo = new Set<string>();

  for (const line of linesForTitle) {
    const phones = line.match(phoneRe) || [];
    const emails = line.match(emailRe) || [];
    if (!phones.length && !emails.length) continue;

    let sector = 'Contato';
    if (/s[íi]ndico/i.test(line)) sector = 'Síndico';
    else if (/administra/i.test(line)) sector = 'Administração';
    else if (/zelador/i.test(line)) sector = 'Zeladoria';
    else if (/portaria/i.test(line)) sector = 'Portaria';

    const info = [...phones, ...emails].join(' | ');
    if (!seenInfo.has(info) && contacts.length < 8) { // Increased to 8 contacts
      seenInfo.add(info);
      contacts.push({ sector, info });
    }
  }

  const sections = RULES_DB.map(def => {
    const relevant = findRelevant(paragraphs, def.keywords.map(k => norm(k)), 5); // Increased to 5 paragraphs
    
    let content = def.fallback;
    const humanizedItems = relevant
      .map(p => humanizeRule(p))
      .filter(p => p.length > 20); // Filter out fragments that became empty or too small after humanizing

    if (humanizedItems.length > 0) {
      content = `${def.intro}\n\n• ${humanizedItems.join('\n\n• ')}`;
    }
    
    return {
      id: def.id,
      title: def.title,
      content,
    };
  });

  return {
    title,
    logoUrl,
    sections,
    contacts: contacts.length > 0 ? contacts : [{ sector: 'Administração', info: 'Consulte a portaria para contatos' }],
    emergencies: [
      { name: 'SAMU', number: '192' },
      { name: 'Polícia', number: '190' },
      { name: 'Bombeiros', number: '193' },
      { name: 'Defesa Civil', number: '199' },
    ],
  };
};
