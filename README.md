Markdown
# 👗 InTracking CRM & Gestão de Ateliê

O **InTracking CRM** é um sistema completo de gestão para ateliês de moda e lojas de noivas. Ele combina o controle de relacionamento com clientes (CRM), gestão de estoque inteligente com baixa automática e um módulo de vendas com cálculos financeiros dinâmicos.

## 🚀 Funcionalidades Atuais (Fase 1)

* **Gestão de Estoque POO:** Diferenciação entre Peças Acabadas (UN) e Insumos (Metros) usando Programação Orientada a Objetos no backend.
* **CRM de Clientes:** Cadastro focado em eventos (como casamentos), com campos de data e status.
* **Vendas Inteligentes:**
    * Baixa automática de estoque no momento da venda.
    * Cálculo de parcelamento automático para Cartão de Crédito.
    * Interface intuitiva com adição dinâmica de múltiplos produtos.
* **Dashboard:** Visão geral de vendas e movimentações.

## 🛠️ Tecnologias Utilizadas

* **Frontend:** React.js, Tailwind CSS, Lucide React (Ícones), Axios.
* **Backend:** Node.js, TypeScript, Express.
* **Arquitetura:** Programação Orientada a Objetos (POO) para gestão de produtos.

## 📋 Próximos Passos (Fase 2)

O projeto está em constante evolução. O escopo planejado inclui:
- [ ] **Módulo de Insumos Avançado:** Cálculo de custo por metro e fornecedores.
- [ ] **Contas a Pagar:** Lançamento de boletos e controle de vencimentos.
- [ ] **Agenda de Provas:** Gestão visual de datas para provas de vestidos e ajustes.
- [ ] **Vendas Sob Medida:** Composição de produtos (Ficha Técnica) que consome múltiplos insumos.
- [ ] **Módulo de Aluguel:** Reserva de itens por data e controle de disponibilidade/lavanderia.

## 🔧 Como Executar o Projeto

### Pré-requisitos
* Node.js instalado
* Git instalado

### 1. Clonar o repositório
```bash
git clone [https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git](https://github.com/SEU_USUARIO/SEU_REPOSITORIO.git)
cd seu-repositorio
2. Configurar o Backend
Bash
cd backend
npm install
npm run dev
O servidor rodará em http://localhost:3000

3. Configurar o Frontend
Abra um novo terminal na raiz do projeto:

Bash
cd frontend
npm install
npm run dev
O sistema estará disponível no endereço indicado pelo Vite (geralmente http://localhost:5173)

📌 Desenvolvido como projeto de automação para Ateliês de Alta Costura.


---

### Por que esse README é importante para você?

1.  **Profissionalismo:** Se você for mostrar isso para alguém ou usar como portfólio, demonstra que você é organizado.
2.  **Guia de Instalação:** Se você precisar formatar seu computador, as instruções de como rodar o projeto já estão ali.
3.  **Mapa do Escopo:** Ele lista o que já fizemos e o que falta, ajudando a manter o foco no desenvolvimento.

**Dica de Git:**
Depois de criar esse arquivo, os comandos seriam:
1. `git add README.md`
2. `git commit -m "Docs: Adicionando README com escopo do projeto"`
3. `git push`

**Tudo pronto para começarmos a "cirurgia" no `main.ts` para as novas funções de Agenda e boletos?**