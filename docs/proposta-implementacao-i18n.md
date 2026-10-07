# Proposta de Implementação de Internacionalização (i18n)

## 1. Objetivo
Adicionar suporte a múltiplos idiomas no Dashboard DataLens, especificamente:
- **Português Brasileiro (pt)**
- **Inglês (en)**
- **Coreano (ko)**

A implementação seguirá o padrão do mercado utilizando `react-i18next`, garantindo que toda a lógica de negócio do React seja isolada da camada de visualização de textos. Nenhuma regra de cálculo de frete ou autenticação será afetada.

## 2. Bibliotecas Necessárias
- `i18next`: Motor principal de tradução.
- `react-i18next`: Integração oficial para componentes React (fornece o hook `useTranslation`).

## 3. Estrutura de Pastas e Arquivos
A seguinte estrutura será adotada dentro de `dashboard/src/`:
```text
dashboard/src/
├── i18n.js                 # Configuração do motor de idiomas
└── locales/
    ├── pt.json             # Dicionário de Português
    ├── en.json             # Dicionário de Inglês
    └── ko.json             # Dicionário de Coreano
```

## 4. Integração Base
O arquivo `i18n.js` será injetado globalmente no arquivo `main.jsx` da aplicação. Dessa forma, todos os componentes abaixo dele ganham superpoderes de tradução.

## 5. Substituição nos Componentes
As telas e janelas (modais) passarão pela seguinte refatoração de UI:

**Antes (Texto Fixo):**
```jsx
<button className="btn">Exportar Relatório</button>
```

**Depois (Texto Dinâmico):**
```jsx
import { useTranslation } from 'react-i18next';

// ... dentro do componente
const { t } = useTranslation();

<button className="btn">{t('export_button')}</button>
```

## 6. Seletor de Idioma (UI)
Será adicionado um componente suspenso (Dropdown) de escolha de idioma no `Header.jsx`, posicionado no canto superior direito. Ao clicar em um idioma, a função `i18n.changeLanguage('ko')` atualizará toda a interface em tempo real, sem recarregar a página.

## 7. Passos de Execução (Roadmap)
1. Instalação do `i18next` via npm.
2. Criação dos dicionários (JSONs) vazios.
3. Varredura componente por componente, extraindo as chaves.
4. Aplicação do gancho `useTranslation()` e substituição do JSX.
5. Inserção do botão de idiomas no `Header.jsx`.
6. Validação local do layout para garantir que palavras mais longas em outros idiomas não quebrem as tabelas ou gráficos.
