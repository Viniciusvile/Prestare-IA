import React from 'react';
import type { HandbookContent } from '../lib/ai';
import { Shield, Users, CreditCard, Move, Dog, Hammer, Trash2, Calendar, Phone, Info, Mail, MapPin } from 'lucide-react';

interface LayoutProps {
  content: HandbookContent;
  logoUrl?: string;
}

const ContactLine: React.FC<{ text: string }> = ({ text }) => {
  const isEmail = text.includes('@');
  const isPhone = /\(?\d{2}\)?\s?\d{4,5}-?\d{4}/.test(text) || text.startsWith('(');
  const isAddress = text.includes(',') || text.includes('Rua') || text.includes('Av.');

  return (
    <div className="flex items-center gap-2 py-0.5">
      {isEmail && <Mail className="w-3 h-3 opacity-60" />}
      {isPhone && <Phone className="w-3 h-3 opacity-60" />}
      {isAddress && <MapPin className="w-3 h-3 opacity-60" />}
      {!isEmail && !isPhone && !isAddress && <div className="w-3 h-3" />}
      <span>{text}</span>
    </div>
  );
};

const getIcon = (id: string) => {
  switch (id) {
    case 'acesso': return <Shield className="w-5 h-5" />;
    case 'comunicacao': return <Users className="w-5 h-5" />;
    case 'financas': return <CreditCard className="w-5 h-5" />;
    case 'mudancas': return <Move className="w-5 h-5" />;
    case 'pets': return <Dog className="w-5 h-5" />;
    case 'obras': return <Hammer className="w-5 h-5" />;
    case 'lixo': return <Trash2 className="w-5 h-5" />;
    case 'areas': return <Calendar className="w-5 h-5" />;
    default: return <Info className="w-5 h-5" />;
  }
};

export const ModernLayout: React.FC<LayoutProps> = ({ content, logoUrl }) => (
  <div className="handbook-export bg-[var(--slate-950)] text-[var(--slate-100)] min-h-full p-8 font-sans">
    <div className="flex flex-col items-center mb-12 border-b border-[var(--slate-800)] pb-8">
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="h-16 object-contain mb-4" />
      ) : (
        <Shield className="w-12 h-12 text-[var(--indigo-500)] mb-4" />
      )}
      <h1 className="text-3xl font-black tracking-tight text-center uppercase">{content.title}</h1>
      <div className="w-16 h-1 bg-[var(--indigo-500)] mt-4"></div>
    </div>
    
    <div className="grid grid-cols-2 gap-8">
      {content.sections.map(section => (
        <div key={section.id} className="p-6 rounded-2xl bg-[var(--slate-900)] border border-[var(--slate-800)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 rounded-lg bg-[var(--indigo-500)]/10 text-[var(--indigo-400)]">
              {getIcon(section.id)}
            </div>
            <h3 className="font-bold text-lg uppercase tracking-tight">{section.title}</h3>
          </div>
          <div className="space-y-3">
            {section.content.split('\n\n').map((para, i) => (
              <p key={i} className="text-sm text-[var(--slate-300)] leading-relaxed">{para}</p>
            ))}
          </div>
        </div>
      ))}
    </div>

    <footer className="mt-12 grid grid-cols-2 gap-8 pt-8 border-t border-[var(--slate-800)]">
      <div>
        <h4 className="font-bold text-[var(--indigo-400)] mb-4 uppercase">Contatos Úteis</h4>
        {content.contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-[110px,1fr] gap-4 text-sm py-2 border-b border-[var(--slate-800)] items-start">
            <span className="text-[var(--slate-500)] font-bold uppercase text-[9px] tracking-wider mt-1">{c.sector}</span>
            <div className="font-medium text-[var(--slate-200)] flex flex-col">
              {c.info.split('\n').map((line, j) => (
                <ContactLine key={j} text={line} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="bg-[var(--indigo-600)] p-6 rounded-2xl flex flex-col justify-center">
        <h4 className="font-bold text-white mb-4 uppercase flex items-center gap-2"><Phone className="w-5 h-5" /> Emergências</h4>
        {content.emergencies.map((e, i) => (
          <div key={i} className="flex justify-between font-bold text-lg">
            <span>{e.name}</span>
            <span>{e.number}</span>
          </div>
        ))}
      </div>
    </footer>
  </div>
);

export const ClassicLayout: React.FC<LayoutProps> = ({ content, logoUrl }) => (
  <div className="handbook-export bg-white text-[var(--slate-900)] min-h-full p-12 font-serif shadow-inner">
    <div className="border-4 border-double border-[var(--slate-200)] p-8 flex flex-col items-center mb-12">
      {logoUrl && <img src={logoUrl} alt="Logo" className="h-20 object-contain mb-6 grayscale" />}
      <h1 className="text-4xl text-center font-bold text-[var(--slate-800)] mb-2 italic">Manual do Proprietário</h1>
      <p className="text-xl uppercase tracking-widest text-[var(--slate-500)]">{content.title}</p>
    </div>

    <div className="space-y-10">
      {content.sections.map(section => (
        <div key={section.id} className="border-l-2 border-[var(--slate-800)] pl-6">
          <h3 className="font-black text-sm uppercase tracking-widest text-[var(--slate-500)] mb-3">{section.title}</h3>
          <div className="space-y-3">
            {section.content.split('\n\n').map((para, i) => (
              <p key={i} className="text-base leading-relaxed text-[var(--slate-800)]">{para}</p>
            ))}
          </div>
        </div>
      ))}
    </div>

    <div className="mt-20 flex justify-between gap-12 bg-[var(--slate-100)] p-10 rounded-lg border border-[var(--slate-200)]">
      <div className="flex-1">
        <h4 className="font-bold text-[var(--slate-800)] mb-4 border-b border-[var(--slate-300)] pb-2">DIRETÓRIO</h4>
        {content.contacts.map((c, i) => (
          <div key={i} className="grid grid-cols-[140px,1fr] gap-4 text-sm py-2 border-b border-[var(--slate-200)] last:border-0 items-start">
            <span className="font-bold italic text-[var(--slate-600)] mt-0.5">{c.sector}:</span>
            <div className="text-[var(--slate-800)] font-medium leading-relaxed flex flex-col">
              {c.info.split('\n').map((line, j) => (
                <ContactLine key={j} text={line} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="flex-1">
        <h4 className="font-bold text-[var(--slate-800)] mb-4 border-b border-[var(--slate-300)] pb-2 uppercase text-red-700">Telefones Importantes</h4>
        {content.emergencies.map((e, i) => (
          <div key={i} className="flex justify-between font-medium text-red-700 py-1">
            <span>{e.name}</span>
            <span>{e.number}</span>
          </div>
        ))}
      </div>
    </div>
  </div>
);

export const MinimalistLayout: React.FC<LayoutProps> = ({ content, logoUrl }) => (
  <div className="handbook-export bg-[#fcfcfc] text-[var(--emerald-950)] min-h-full p-10 font-sans">
    <div className="flex items-center gap-6 mb-16 px-4">
      {logoUrl ? (
        <img src={logoUrl} alt="Logo" className="h-12 w-12 object-contain rounded-full bg-white shadow-sm" />
      ) : (
        <div className="w-12 h-12 bg-white rounded-full shadow-sm flex items-center justify-center text-[var(--emerald-600)]">
          <Shield className="w-6 h-6" />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-light tracking-tight">{content.title}</h1>
        <p className="text-[10px] uppercase font-bold tracking-[0.2em] opacity-40">Condo Handbook</p>
      </div>
    </div>

    <div className="grid grid-cols-1 gap-16">
      {content.sections.map(section => (
        <div key={section.id} className="px-4 border-t border-[var(--emerald-100)] pt-8">
          <div className="flex items-baseline gap-4 mb-4">
            <span className="text-[10px] font-bold text-[var(--emerald-500)] tracking-tighter uppercase">Cap. {section.id.substring(0, 2)}</span>
            <h3 className="text-lg font-medium">{section.title}</h3>
          </div>
          <div className="space-y-3 max-w-xl">
            {section.content.split('\n\n').map((para, i) => (
              <p key={i} className="text-sm leading-relaxed" style={{ color: 'rgba(6,78,59,0.75)' }}>{para}</p>
            ))}
          </div>
        </div>
      ))}
    </div>

    <footer className="mt-32 pt-16 border-t border-[var(--emerald-100)] flex flex-col gap-12">
      <div className="flex justify-between items-start gap-20">
        <div className="flex-1">
          <h4 className="font-bold mb-8">Canais de Contato</h4>
          <div className="grid grid-cols-2 gap-x-12 gap-y-4">
            {content.contacts.map((c, i) => (
              <div key={i} className="text-sm">
                <span className="text-[var(--emerald-500)] block text-[10px] uppercase font-bold mb-1">{c.sector}</span>
                <div className="text-[var(--emerald-900)] flex flex-col">
                  {c.info.split('\n').map((line, j) => (
                    <ContactLine key={j} text={line} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="w-px h-32 bg-[var(--emerald-100)]"></div>
        <div className="flex-1">
          <h4 className="font-bold mb-8 text-[var(--red-500)]">SOS & Emergências</h4>
          {content.emergencies.map((e, i) => (
            <div key={i} className="flex justify-between py-2 border-b border-[var(--emerald-50)]/50">
              <span className="font-medium">{e.name}</span>
              <span className="font-bold text-[var(--red-500)]">{e.number}</span>
            </div>
          ))}
        </div>
      </div>
      <p className="text-xs text-[var(--emerald-900)]/30">© Prestare IA - Gerado automaticamente em Março 2026</p>
    </footer>
  </div>
);
