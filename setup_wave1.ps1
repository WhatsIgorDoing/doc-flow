# ============================================
# WAVE 1: Backend Isolation & Setup
# Script de criação de estrutura de diretórios
# ============================================

Write-Host "🚀 Iniciando Wave 1 - Backend Isolation & Setup" -ForegroundColor Green
Write-Host ""

# Diretório base do projeto
$BASE_DIR = $PSScriptRoot

# Criar estrutura de diretórios
$DIRECTORIES = @(
    "app/core",
    "app/domain",
    "app/services",
    "app/infrastructure",
    "app/ui/pages",
    "app/ui/components",
    "app/workers",
    "assets",
    "tests/unit",
    "tests/integration"
)

Write-Host "📁 Criando estrutura de diretórios..." -ForegroundColor Cyan

foreach ($dir in $DIRECTORIES) {
    $path = Join-Path $BASE_DIR $dir
    if (-not (Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force | Out-Null
        Write-Host "  ✅ Criado: $dir" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Já existe: $dir" -ForegroundColor Yellow
    }
}

# Criar arquivos __init__.py vazios
$PYTHON_PACKAGES = @(
    "app",
    "app/core",
    "app/domain",
    "app/services",
    "app/infrastructure",
    "app/ui",
    "app/ui/pages",
    "app/ui/components",
    "app/workers",
    "tests",
    "tests/unit",
    "tests/integration"
)

Write-Host ""
Write-Host "🐍 Criando arquivos __init__.py..." -ForegroundColor Cyan

foreach ($pkg in $PYTHON_PACKAGES) {
    $init_file = Join-Path $BASE_DIR "$pkg/__init__.py"
    if (-not (Test-Path $init_file)) {
        New-Item -ItemType File -Path $init_file -Force | Out-Null
        Write-Host "  ✅ Criado: $pkg/__init__.py" -ForegroundColor Green
    } else {
        Write-Host "  ⏭️  Já existe: $pkg/__init__.py" -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "✨ Estrutura de diretórios criada com sucesso!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Estrutura criada:" -ForegroundColor Cyan
Write-Host "  /app" -ForegroundColor White
Write-Host "    /core         (Configs, Logging, Constants)" -ForegroundColor Gray
Write-Host "    /domain       (Models Puros)" -ForegroundColor Gray
Write-Host "    /services     (Use Cases Async)" -ForegroundColor Gray
Write-Host "    /infrastructure (Database, Repositories)" -ForegroundColor Gray
Write-Host "    /ui           (NiceGUI Pages & Components)" -ForegroundColor Gray
Write-Host "    /workers      (Sync Service)" -ForegroundColor Gray
Write-Host "  /assets         (Imagens, Ícones)" -ForegroundColor Gray
Write-Host "  /tests          (Testes Async)" -ForegroundColor Gray
Write-Host ""
Write-Host "🎯 Próximo passo: Execute 'python run.py' para testar o backend" -ForegroundColor Yellow
