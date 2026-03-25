export interface HandbookContent {
  title: string;
  logoUrl?: string;
  sections: {
    id: string;
    title: string;
    content: string;
    icon?: string;
  }[];
  contacts: {
    sector: string;
    info: string;
  }[];
  emergencies: {
    name: string;
    number: string;
  }[];
}

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Model config
const MODELS = ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-flash-latest"];
const BASE_URL = "https://generativelanguage.googleapis.com/v1beta/models";

export const generateHandbookWithAI = async (text: string, logoUrl?: string): Promise<HandbookContent> => {
  const prompt = `
    VOCÊ É O MAIOR ESPECIALISTA EM ANÁLISE DE CONDOMÍNIOS DO BRASIL.
    Sua missão é extrair CADA DETALHE de regras de uma Convenção e Atas para criar uma Cartilha do Morador EXAUSTIVA e COMPLETA.

    🧠 ESTRATÉGIA DE EXTRAÇÃO MESTRE:
    - FASE 0 (METADADOS): Identifique o NOME DO CONDOMÍNIO (olhe o nome do arquivo "Ideale Clube").
    - FASE 0.1 (CONTATOS E NOMES): Procure QUALQUER nome de pessoa ou empresa associada aos cargos: SÍNDICO, ADMINISTRADORA, ZELADOR, GERENTE predial, CONSELHO fiscal/consultivo. 
      * Se achar "Administradora X", coloque na seção de contatos. 
      * Se achar "Síndico(a) Fulano de Tal", coloque na seção de contatos.
    - FASE 1 (DESCOBERTA): Leia o texto inteiro. Se não achar uma regra específica (ex: Piscina), use as regras gerais de Lazer e Uso Comum.
    - FASE 2 (REMAPEAMENTO):
       * Silêncio: Decibéis, instrumentos, festas, reformas barulhentas.
       * Pets: Elevadores permitidos, guia, focinheira, higiene.
       * Garagem: Velocidade (10km/h), lavagem de carro, depósito de objetos.
       * Lazer: Uso por visitantes, vestimenta, reservas.
       * Decisões Recentes: FOCO TOTAL NAS ATAS. Extraia TUDO: novos valores de multa, obras em andamento, novos horários votados.
    - FASE 3 (DETALHAMENTO): Não economize texto. Transforme "É proibido" em "Como conviver melhor". Seja exaustivo.

    📤 SAÍDA JSON RESTRITA (RETORNE APENAS O JSON):
    {
      "title": "NOME OFICIAL DO CONDOMÍNIO",
      "sections": [
        { "id": "apresentacao", "title": "1. APRESENTAÇÃO", "content": "Boas-vindas calorosas e o propósito desta cartilha." },
        { "id": "regras", "title": "2. REGRAS GERAIS", "content": "Deveres e direitos fundamentais extraídos dos artigos principais." },
        { "id": "silencio", "title": "3. SILÊNCIO E CONVIVÊNCIA", "content": "Regras detalhadas de ruído, horários noturnos e comportamento." },
        { "id": "pets", "title": "4. ANIMAIS DE ESTIMAÇÃO", "content": "Normas de circulação, segurança e higiene para os pets." },
        { "id": "garagem", "title": "5. GARAGENS E VEÍCULOS", "content": "Uso das vagas, limites de velocidade e proibição de depósitos." },
        { "id": "lazer", "title": "6. ÁREAS COMUNS", "content": "Tudo sobre Piscina, Salão de Festas, Academia, Churrasqueira e Playground." },
        { "id": "obras", "title": "7. OBRAS E REFORMAS", "content": "Horários de barulho, necessidade de ART/RRT e descarte de entulho." },
        { "id": "taxas", "title": "8. TAXAS E MULTAS", "content": "Informações sobre boletos, juros, correções e arrecadações extras." },
        { "id": "penalidades", "title": "9. PENALIDADES", "content": "Processo de advertência e valores de multas por infração." },
        { "id": "recentes", "title": "10. DECISÕES RECENTES", "content": "Resumo detalhado de TUDO que foi decidido nas ATAS anexadas." },
        { "id": "contatos", "title": "11. CONTATOS E ADMINISTRAÇÃO", "content": "Contatos de síndico, zelador, portaria e administradora encontrados no texto." }
      ],
      "contacts": [ 
        { "sector": "Nome do Cargo (ex: Síndico ou Administradora)", "info": "Nome da pessoa/empresa e contato se houver" } 
      ],
      "emergencies": [
        { "name": "SAMU", "number": "192" },
        { "name": "Polícia", "number": "190" },
        { "name": "Bombeiros", "number": "193" }
      ]
    }

    ⚠️ RECURSO DE SALVAMENTO: NUNCA diga "Não identificado" se houver qualquer menção mínima. Se não achar o nome do Síndico ou Administradora, diga "Consulte o quadro de avisos ou a portaria para falar com [Cargo]".

    TEXTO DOS DOCUMENTOS (PROCESSAR ATÉ 500 MIL CARACTERES):
    ${text.substring(0, 500000)}
  `;

  let lastError: string = "A IA não conseguiu interpretar o volume de dados.";

  for (const model of MODELS) {
    try {
      const url = `${BASE_URL}/${model}:generateContent?key=${API_KEY}`;
      console.log(`Deep Extraction initializing with ${model}...`);
      
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        const errorMsg = data.error?.message || response.statusText;
        if (response.status === 429) lastError = `Limite atingido: ${model}.`;
        else if (response.status !== 404) lastError = `Erro ${response.status} em ${model}: ${errorMsg}`;
        continue;
      }

      const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!candidate) continue;

      let jsonText = candidate;
      const jsonMatch = candidate.match(/```json\s*([\s\S]*?)```/) || candidate.match(/\{[\s\S]*\}/);
      if (jsonMatch) jsonText = jsonMatch[1] || jsonMatch[0];
      
      try {
        const parsed: HandbookContent = JSON.parse(jsonText.trim());
        if (logoUrl) parsed.logoUrl = logoUrl;
        
        // Always include the official Prestare contact
        const prestareContact = {
          sector: "Administradora / Registro",
          info: "Prestare\n(17) 3525-3542\ncontato@prestaregestao.com.br\nRua Maranhão, 1368, 3º andar - Sala 30 - Centro, Catanduva - SP"
        };
        
        // Add as first contact if not already present
        if (!parsed.contacts.some(c => c.sector.includes("Administradora") || c.sector.includes("Prestare"))) {
          parsed.contacts.unshift(prestareContact);
        } else {
          // Replace its content with the official one
          const idx = parsed.contacts.findIndex(c => c.sector.includes("Administradora") || c.sector.includes("Prestare"));
          parsed.contacts[idx] = prestareContact;
        }

        console.log(`Success: Full deep extraction completed by ${model}`);
        return parsed;
      } catch (e) {
        console.error("JSON Parse fail on model result:", jsonText.substring(0, 100));
        continue;
      }
    } catch (err) {
      console.error(`Attempt fail with ${model}:`, err);
      lastError = err instanceof Error ? err.message : String(err);
    }
  }

  throw new Error(`Erro na Extração Máxima: ${lastError}`);
};
