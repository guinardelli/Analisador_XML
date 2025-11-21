# AI Development Rules - Modo PRO

Este documento define as regras e convenções para desenvolvimento orientado por IA deste aplicativo.

## Tech Stack

* **Framework**: React 19 com Hooks
* **Linguagem**: TypeScript
* **Build Tool**: Vite
* **Estilização**: Tailwind CSS (configurado via CDN no `index.html`)
* **Roteamento**: React Router DOM para navegação entre páginas
* **Visualização de Dados**: Chart.js com `react-chartjs-2` para criação de gráficos
* **Ícones**: Lucide React para ícones de UI
* **Componentes UI**: Usar componentes shadcn/ui para consistência (ex: Input, Button, Card)

## Estrutura de Pastas

```
src/
├── components/
│   ├── ui/           # Componentes shadcn/ui
│   ├── layout/       # Componentes de layout (Header, Footer, Sidebar, etc)
│   └── features/     # Componentes específicos de features/funcionalidades
├── pages/            # Páginas/Rotas da aplicação
├── hooks/            # Custom hooks reutilizáveis
├── utils/            # Funções utilitárias
├── types/            # Definições e interfaces TypeScript
├── context/          # Context API providers
├── services/         # Lógica de API e serviços externos
└── constants/        # Constantes e configurações
```

## Regras de Uso de Bibliotecas

### Estilização
* **Obrigatório**: Toda estilização DEVE ser feita usando classes utilitárias do Tailwind CSS
* Evitar criar arquivos CSS customizados ou usar tags `<style>`, exceto para estilos globais absolutamente necessários
* Usar classes responsivas do Tailwind (`sm:`, `md:`, `lg:`, `xl:`, `2xl:`)
* Aplicar dark mode quando apropriado usando `dark:` prefix

### Gerenciamento de Estado
* **Estado Local**: Usar `useState` e `useReducer` para estado de componente
* **Estado Global**: Usar React Context API para estado compartilhado
* Evitar prop drilling excessivo - considerar Context quando props passam por mais de 2 níveis

### Roteamento
* **Obrigatório**: Toda navegação DEVE ser tratada pelo `react-router-dom`
* Definir todas as rotas centralmente no arquivo `App.tsx`
* Usar `lazy loading` para rotas quando apropriado (code splitting)
* Implementar rotas protegidas quando necessário autenticação

### Componentes
* Criar componentes pequenos e reutilizáveis no diretório `src/components`
* Páginas (componentes de nível superior para rotas) devem estar em `src/pages`
* Manter componentes focados em uma única responsabilidade (Single Responsibility Principle)
* Extrair lógica complexa para custom hooks

### Ícones e Formulários
* **Ícones**: Usar exclusivamente `lucide-react` para manter consistência visual
* **Formulários**: Construir usando componentes shadcn/ui como `Input`, `Label`, `Button`
* Sempre validar dados de entrada de formulários

## TypeScript - Padrões Obrigatórios

### Tipagem
* **Evitar `any`**: Sempre tipar adequadamente. Use `unknown` quando o tipo é genuinamente incerto
* **Types vs Interfaces**: 
  - Usar `type` para unions, intersections e tipos complexos
  - Usar `interface` para objetos que podem ser estendidos
* **Props de Componentes**: Sempre definir tipos explícitos para props
* **Enums**: Preferir `const` objects em vez de `enum` quando possível para melhor tree-shaking

### Convenções
```typescript
// Props de componentes
interface ButtonProps {
  label: string;
  onClick: () => void;
  variant?: 'primary' | 'secondary';
}

// Tipos para dados
type User = {
  id: string;
  name: string;
  email: string;
};

// Const objects (preferível a enum)
const STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
} as const;

type Status = typeof STATUS[keyof typeof STATUS];
```

## Nomenclatura

* **Componentes**: PascalCase (ex: `UserProfileCard`, `DashboardLayout`)
* **Arquivos de Componentes**: PascalCase correspondente (ex: `UserProfileCard.tsx`)
* **Hooks Customizados**: camelCase com prefixo `use` (ex: `useAuth`, `useFetchData`, `useLocalStorage`)
* **Funções e Variáveis**: camelCase (ex: `getUserData`, `isLoading`, `handleSubmit`)
* **Constantes**: UPPER_SNAKE_CASE (ex: `API_BASE_URL`, `MAX_RETRY_ATTEMPTS`)
* **Types/Interfaces**: PascalCase (ex: `UserData`, `ApiResponse`, `FormValues`)
* **Interfaces de Props**: Sufixo `Props` (ex: `ButtonProps`, `CardProps`)
* **Arquivos Utilitários**: camelCase (ex: `formatDate.ts`, `validateEmail.ts`)

## Performance e Otimização

### Memoização
* Usar `React.memo()` para componentes que renderizam frequentemente com mesmas props
* Usar `useCallback` para funções passadas como props ou usadas em dependências de hooks
* Usar `useMemo` para cálculos pesados ou transformações de dados complexas

### Code Splitting
* Implementar `React.lazy()` e `Suspense` para lazy loading de rotas
* Considerar lazy loading para componentes grandes não imediatamente visíveis

### Listas e Performance
* Para listas com mais de 100 itens, considerar virtualização
* Sempre usar `key` prop única e estável em listas
* Evitar usar index como key em listas dinâmicas

### Recursos
* Otimizar imagens (WebP, compressão adequada)
* Implementar lazy loading de imagens quando apropriado
* Minimizar bundle size removendo dependências não utilizadas

## Tratamento de Erros

### Error Boundaries
* Implementar Error Boundaries para capturar erros de renderização
* Fornecer UI de fallback amigável ao usuário

### Operações Assíncronas
* Sempre usar `try-catch` em operações assíncronas
* Implementar estados de loading e erro nos componentes
* Validar responses de API antes de processar

### Validação
* Validar todos os dados de entrada de usuário
* Validar dados recebidos de APIs externas
* Implementar mensagens de erro claras e acionáveis

### Feedback ao Usuário
* Sempre fornecer feedback visual para ações (loading, sucesso, erro)
* Usar toasts ou notifications para feedback não-bloqueante
* Implementar estados de carregamento (skeletons, spinners)

## Acessibilidade (a11y)

### HTML Semântico
* Usar tags semânticas apropriadas: `<header>`, `<nav>`, `<main>`, `<article>`, `<section>`, `<footer>`
* Evitar divs genéricas quando elementos semânticos são apropriados

### Navegação
* Garantir navegação completa por teclado (Tab, Enter, Esc, Arrow keys)
* Manter indicadores de foco visíveis e com bom contraste
* Implementar skip links quando necessário

### ARIA e Contraste
* Adicionar atributos ARIA quando elementos nativos não são suficientes
* Seguir WCAG 2.1 Level AA para contraste de cores (mínimo 4.5:1 para texto normal)
* Sempre incluir `alt` text descritivo em imagens informativas
* Usar `aria-label` ou `aria-labelledby` para elementos interativos sem texto visível

### Formulários
* Associar corretamente `<label>` com inputs
* Fornecer mensagens de erro acessíveis (aria-describedby, aria-invalid)

## Documentação

### Comentários no Código
* Comentar o "porquê", não o "o quê" (o código deve ser auto-explicativo)
* Documentar funções complexas com JSDoc
* Adicionar comentários explicativos para lógica de negócio não-óbvia

### JSDoc
```typescript
/**
 * Calcula o valor total do carrinho aplicando descontos
 * @param items - Array de itens do carrinho
 * @param discountCode - Código de desconto opcional
 * @returns Valor total calculado com descontos aplicados
 */
function calculateTotal(items: CartItem[], discountCode?: string): number {
  // implementação
}
```

### README
* Manter README.md atualizado com:
  - Instruções de instalação e setup
  - Visão geral da arquitetura
  - Scripts disponíveis
  - Informações de deploy

## Git e Commits

### Conventional Commits
* Usar formato: `tipo(escopo): descrição`
* Tipos principais:
  - `feat`: Nova funcionalidade
  - `fix`: Correção de bug
  - `docs`: Mudanças em documentação
  - `style`: Formatação, ponto e vírgula, etc (não afeta código)
  - `refactor`: Refatoração de código
  - `perf`: Melhorias de performance
  - `test`: Adição ou correção de testes
  - `chore`: Atualizações de build, configs, etc

### Exemplos
```
feat(auth): adiciona login com Google
fix(dashboard): corrige cálculo de totais
docs(readme): atualiza instruções de setup
refactor(components): extrai lógica de formulário para hook
```

### Boas Práticas
* Commits pequenos e focados em uma única mudança
* Mensagens descritivas e claras em português
* Evitar commits com múltiplas funcionalidades não relacionadas

## Modo PRO - Diretrizes Avançadas

### Análise Antes da Implementação

#### Planejamento
* Analisar o impacto da mudança em todo o aplicativo antes de implementar
* Identificar dependências e componentes afetados
* Considerar edge cases e cenários de erro
* Planejar testes necessários para validar a implementação

#### Arquitetura
* Propor refatorações quando identificar code smells:
  - Duplicação de código
  - Componentes muito grandes (>300 linhas)
  - Lógica de negócio em componentes de UI
  - Props drilling excessivo
* Sugerir melhorias de arquitetura quando aplicável
* Considerar escalabilidade e manutenibilidade

### Qualidade de Código

#### Princípios SOLID
* **S**ingle Responsibility: Um componente/função deve ter apenas uma responsabilidade
* **O**pen/Closed: Aberto para extensão, fechado para modificação
* **L**iskov Substitution: Componentes derivados devem ser substituíveis
* **I**nterface Segregation: Não forçar dependências desnecessárias
* **D**ependency Inversion: Depender de abstrações, não de implementações concretas

#### DRY (Don't Repeat Yourself)
* Extrair lógica duplicada para funções/hooks reutilizáveis
* Criar componentes genéricos quando há padrões repetidos
* Usar composição para evitar duplicação

#### Clean Code
* Funções pequenas e focadas (máximo 20-30 linhas idealmente)
* Nomes descritivos e auto-explicativos
* Evitar aninhamento profundo (máximo 3-4 níveis)
* Preferir early returns para reduzir complexidade

### Revisão e Validação

#### Checklist Antes de Finalizar
- [ ] TypeScript sem erros ou warnings
- [ ] Classes Tailwind aplicadas corretamente e responsivas
- [ ] Testado em diferentes breakpoints (mobile, tablet, desktop)
- [ ] Acessibilidade básica implementada (navegação por teclado, contraste)
- [ ] Performance verificada (sem re-renders desnecessários)
- [ ] Tratamento de erros implementado
- [ ] Loading states e feedback ao usuário
- [ ] Consistente com padrões do projeto
- [ ] Documentação atualizada se necessário

#### Testes Manuais
* Testar fluxos principais da funcionalidade
* Testar edge cases identificados
* Verificar comportamento em diferentes estados (loading, erro, vazio, sucesso)
* Testar responsividade em diferentes dispositivos

### Comunicação e Documentação

#### Explicações Técnicas
* Explicar decisões técnicas importantes tomadas
* Justificar escolhas de implementação quando há trade-offs
* Alertar sobre possíveis impactos ou limitações
* Sugerir alternativas quando houver múltiplas soluções válidas

#### Documentação de Mudanças
* Documentar mudanças significativas de arquitetura
* Atualizar comentários quando a lógica muda
* Manter README e documentação técnica sincronizados com o código
* Adicionar exemplos de uso para APIs ou hooks complexos

### Proatividade e Melhorias Contínuas

#### Identificação Proativa
* Identificar e corrigir problemas relacionados mesmo que não explicitamente solicitados
* Detectar inconsistências de estilo ou padrões
* Encontrar oportunidades de otimização durante modificações
* Alertar sobre potenciais problemas de segurança ou performance

#### Sugestões de Melhoria
* Sugerir melhorias de UX/UI quando pertinente:
  - Estados vazios mais informativos
  - Feedback visual mais claro
  - Microinterações que melhoram a experiência
* Propor otimizações de performance quando identificar gargalos
* Recomendar bibliotecas ou ferramentas que podem simplificar implementações

#### Consistência
* Manter consistência com padrões já estabelecidos no projeto
* Seguir convenções de nomenclatura existentes
* Usar mesmos padrões de estrutura de componentes
* Respeitar decisões arquiteturais já tomadas

### Priorização e Contexto

#### Entendimento de Requisitos
* Esclarecer requisitos ambíguos antes de implementar
* Confirmar entendimento de regras de negócio complexas
* Identificar requisitos implícitos ou não especificados

#### Foco no Solicitado
* Priorizar resolver o problema solicitado de forma completa
* Evitar over-engineering ou adicionar funcionalidades não pedidas
* Balancear qualidade com pragmatismo (nem sempre a solução perfeita é necessária)
* Sinalizar quando mudanças maiores seriam benefíciais mas implementar apenas o solicitado

---

## Regras Obrigatórias

* ✅ **Idioma do Aplicativo**: Português Brasileiro
* ✅ **Capacidade da IA**: Utilizar toda capacidade disponível para chegar no melhor resultado possível
* ✅ **Mudanças Cirúrgicas**: Evitar alterar o que não foi solicitado, apenas quando estritamente necessário
* ✅ **Verificação de Impacto**: Sempre verificar o impacto de mudanças em outras partes do aplicativo para garantir consistência
* ✅ **Análise Completa**: Revisar código relacionado antes de implementar para entender contexto completo
* ✅ **Testes de Integração**: Considerar como mudanças afetam funcionalidades existentes

---

## Recursos Adicionais

### Links Úteis
* [React Documentation](https://react.dev)
* [TypeScript Handbook](https://www.typescriptlang.org/docs/)
* [Tailwind CSS Docs](https://tailwindcss.com/docs)
* [shadcn/ui Components](https://ui.shadcn.com)
* [React Router](https://reactrouter.com)
* [WCAG Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)

### Ferramentas Recomendadas
* ESLint para linting
* Prettier para formatação
* TypeScript Strict Mode habilitado
* React Developer Tools
* Lighthouse para auditoria de performance e acessibilidade