$ErrorActionPreference = 'Stop'
$compiler = Join-Path $env:WINDIR 'Microsoft.NET/Framework64/v4.0.30319/csc.exe'
if (!(Test-Path -LiteralPath $compiler)) { throw '未找到.NET Framework编译器；可直接打开app/index.html。' }
$outputArgument = '/out:' + (Join-Path $PSScriptRoot '人口与养老金情景模拟器.exe')
& $compiler /nologo /target:winexe /optimize+ /debug- /reference:System.Windows.Forms.dll $outputArgument (Join-Path $PSScriptRoot 'desktop.cs')
if ($LASTEXITCODE -ne 0) { throw '构建失败' }
