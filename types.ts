
export interface ClientData {
  name: string;
  address: string;
  city: string;
  uf: string;
  phone: string; // Este é o telefone da empresa no contexto atual, mas ClientData geralmente refere-se ao cliente
  cep: string;
  cpfCnpj: string;
  clientPhone: string; // Novo campo substituindo RG/IE
  email: string;
  obs: string;
  date: string;
  quoteNumber: string;
}

export interface QuoteItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  image?: string;
  notes?: string;
}

export interface CompanyInfo {
  name: string;
  owner: string;
  address: string;
  cep: string;
  city: string;
  cnpj: string;
  phone: string;
}

export interface SavedQuote {
  id: string;
  timestamp: number;
  clientData: ClientData;
  items: QuoteItem[];
  budgetInfo: {
    color: string;
    info: string;
  };
  observations: string;
}
