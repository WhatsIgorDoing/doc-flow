# Plano de Reformulação UI/UX (Premium Apple-Like)

## 📋 Visão Geral
**Objetivo**: Elevar a interface para um padrão "Apple Premium". O foco é clareza absoluta, tipografia perfeita, animações fluidas (física de mola) e uma estética minimalista de alto padrão.

**Conceito Chave**: "Complexidade Invisível". O sistema faz muito, mas parece simples e calmo.

## 🎨 Estratégia de Design: "Deep Swiss / Apple Glass"

**Direção Visual**:
- **Paleta**: Fundos Off-White/Cinza Suave (#F5F5F7), Superfícies Brancas (#FFFFFF) com sombras difusas, Texto Preto/Cinza Escuro (#1D1D1F).
- **Materiais**: Uso estratégico de `backdrop-blur` (Glassmorphism) em cabeçalhos e painéis flutuantes.
- **Bordas**: Sutis (1px solid #E5E5E5), nada de bordas pretas grossas.
- **Raios**: Curvas consistentes e suaves (Raio de 12px a 20px - "Squircle" feel).
- **Tipografia**: Inter (substituto para San Francisco), com pesos variados para hierarquia clara.

**Movimento & Interação**:
- **Física**: Todas as animações usam curvas de mola (spring physics), nada linear.
- **Feedback**: Botões "afundam" levemente (scale 0.98) ao clicar.
- **Transições**: Painéis entram suavemente (fade + slide up).

## 📂 Estrutura de Arquivos (Atomic Design)
```
app/ui/
├── theme/
│   ├── design_system.py    # Tokens de Design (Cores, Sombras, Tipografia)
│   └── global_styles.py    # CSS Global (Scrollbars, Fontes)
├── components/
│   ├── atoms/
│   │   ├── button.py       # Apple-style buttons (Primary/Secondary/Ghost)
│   │   ├── card.py         # Glass/Surface cards com elevação correta
│   │   └── input.py        # Inputs limpos com foco sutil
│   ├── molecules/
│   │   ├── file_picker.py  # Área de Drop moderna
│   │   └── status_pill.py  # Badges de status elegantes
│   └── organisms/
│   │   ├── hero.py         # Cabeçalho de impacto
│   │   └── results.py      # Lista de resultados com animação
└── pages/
    └── dashboard.py        # Composição final
```

## 📝 Detalhamento das Tarefas

### Fase 1: Fundação Premium (`theme/`)
- [ ] **Design Tokens**: Implementar paleta de cinzas Apple, sombras de camadas (layer styles) e blur.
- [ ] **Tipografia**: Configurar família Inter/System-UI com tracking refinado.
- [ ] **Reset CSS**: Remover estilos padrão do Quasar/Material que "entregam" o framework.

### Fase 2: Componentes Essenciais (Átomos/Moléculas)
- [ ] **Glass Card**: Container com fundo branco semi-transparente, borda fina e sombra difusa grande.
- [ ] **Botão "Cupertino"**: Botões com gradientes sutis ou flat colors vibrantes (Azul Apple), cantos arredondados, sem uppercase forçado.
- [ ] **Input Clean**: Campos de formulário minimalistas, sem linhas de base pesadas.

### Fase 3: A Experiência do Dashboard
- [ ] **Arquitetura de Informação**:
    - **Topo**: Saudação contextual ("Bom dia"), Status do Sistema discreto.
    - **Centro**: Ação Principal (Drop Zone) em destaque, convidativa.
    - **Baixo**: Histórico/Resultados aparecem sob demanda, não poluem a tela inicial.
- [ ] **Animações de Entrada**: Elementos carregam em sequência (Staggered fade-up).
- [ ] **Visualização de Dados**: Gráficos de barra minimalistas para contagem de arquivos.

### Fase 4: Polimento "Pixel-Perfect"
- [ ] **Espaço em Branco**: Aumentar drasticamente as margens e paddings. O luxo precisa de espaço.
- [ ] **ícones**: Usar ícones de linha fina (Heroicons ou Phosphor) em vez de Material Icons preenchidos.
- [ ] **Micro-interações**: Hover states suaves em todas as listas.

## ✅ Critérios de Sucesso
- [ ] A interface parece "nativa" do OS (macOS/iOS feel).
- [ ] Nenhuma cor "padrão" (Azul puro, Vermelho puro) visível.
- [ ] Animações não travam e parecem naturais.
- [ ] Usuário sente "prazer" ao interagir.
