# SAD_APP v2.0

**Sistema de Automação de Documentos**

[![Python](https://img.shields.io/badge/Python-3.11-blue.svg)](https://www.python.org/)
[![Tests](https://img.shields.io/badge/Tests-43%2F43%20passing-brightgreen.svg)](./tests)
[![Status](https://img.shields.io/badge/Status-Produção-success.svg)]()
[![Architecture](https://img.shields.io/badge/Architecture-Clean-blue.svg)]()

Sistema desktop que automatiza a validação, reconciliação e organização de documentos técnicos de engenharia, comparando arquivos físicos contra manifestos Excel e organizando-os em lotes balanceados.

---

## 🚀 Quick Start

### 1. Instalação
```bash
cd c:\Development\teste\sad_app_v2
pip install -r requirements.txt
```

### 2. Executar Aplicação
```bash
python -m src.sad_app_v2.presentation.main_view
```

### 3. Executar Testes
```bash
pytest tests/ -v
```

---

## ✨ Funcionalidades Principais

- ✅ **Validação Automática**: Compara arquivos contra manifesto Excel (reduz 95% do tempo manual)
- 🔍 **OCR Inteligente**: Extrai códigos de documentos PDF/DOCX usando perfis configuráveis
- 📦 **Organização de Lotes**: Balanceamento automático com algoritmo greedy
- 🎨 **Interface Gráfica**: UI desktop moderna com CustomTkinter
- 📊 **Rastreabilidade**: Logs completos para auditoria e conformidade

---

## 🛠️ Stack Tecnológica

**Core:**
- Python 3.11.3
- CustomTkinter (UI Desktop)
- Clean Architecture (Hexagonal)

**Processamento:**
- openpyxl (Excel)
- PyPDF2 → pypdf (PDF)
- python-docx (DOCX)

**Testes:**
- pytest (100% cobertura)

---

## 📚 Documentação Completa

A documentação completa está organizada em [`/docs`](./docs/00_README.md):

### 📖 Guias
- [Guia do Usuário](./docs/03_guia_usuario.md) - Manual de uso
- [Guia do Desenvolvedor](./docs/04_guia_desenvolvedor.md) - Setup e desenvolvimento

### 🔍 Análises Técnicas
- [Auditoria Técnica](./docs/09a_sumario_auditoria.md) - Stack, dependências e riscos
- [Análise de Negócio](./docs/10a_resumo_visual_negocio.md) - Entidades e regras
- [Resumo de Produto](./docs/11a_product_brief.md) - ROI e proposta de valor

### 🏗️ Arquitetura
- [Arquitetura do Sistema](./docs/05_arquitetura.md)
- [Casos de Uso](./docs/06_casos_de_uso.md)

---

## 📊 Status do Projeto

| Aspecto                  | Status                  |
| ------------------------ | ----------------------- |
| **Versão**               | 2.0                     |
| **Testes**               | ✅ 43/43 passando (100%) |
| **Última Atualização**   | 26/01/2026              |
| **Arquitetura**          | Clean Architecture      |
| **Pronto para Produção** | ✅ Sim                   |

---

## 💡 Uso Básico

```python
# UC-01: Validar Lote
manifesto = "caminho/manifesto.xlsx"
diretorio = "caminho/documentos/"
validados, nao_reconhecidos = validar_lote(manifesto, diretorio)

# UC-03: Organizar em Lotes
organizar_lotes(
    validados,
    output_dir="caminho/saida/",
    max_docs_per_lot=50
)
```

---

## 🤝 Contribuindo

Este projeto segue Clean Architecture e padrões de código definidos em [`@clean-code`](./docs/04_guia_desenvolvedor.md).

**Antes de contribuir:**
1. Leia o [Guia do Desenvolvedor](./docs/04_guia_desenvolvedor.md)
2. Execute todos os testes: `pytest tests/ -v`
3. Verifique conformidade: `python .agent/scripts/checklist.py .`

---

## 📄 Licença

Projeto interno - Todos os direitos reservados.

---

**Desenvolvido com Clean Architecture e boas práticas de engenharia de software.**
