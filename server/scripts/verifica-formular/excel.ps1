# S17c - Excel ca arbitru: deschide fiecare formular generat intr-o instanta Excel
# invizibila, cu macro-urile active DOAR pe acea instanta (nicio setare permanenta),
# recalculeaza tot, SALVEAZA (asa se umple foaia "Portal", din Workbook_BeforeSave),
# citeste intervalele cerute si inchide. Niciun macro nu e apelat explicit: ruleaza
# doar ce ruleaza Excel singur la deschidere (Workbook_Open: bara de butoane Bilka)
# si la salvare (ExportToPortal). Nimic nu pleaca nicaieri (vezi raportul, sectiunea VBA).
#
# Folosire: powershell -NoProfile -ExecutionPolicy Bypass -File excel.ps1 <job.json>
# job.json: { "fisiere": [{ "cale": "...xlsm", "iesire": "...json" }], "citiri": [{ "foaie": "...", "interval": "A1:B2" }], "pid": "...pid.txt" }

param([Parameter(Mandatory = $true)][string]$Job)

$ErrorActionPreference = "Stop"
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$sarcina = Get-Content -LiteralPath $Job -Raw -Encoding UTF8 | ConvertFrom-Json

function Scrie-Json([string]$cale, $obiect) {
  $text = $obiect | ConvertTo-Json -Depth 6 -Compress
  [System.IO.File]::WriteAllText($cale, $text, (New-Object System.Text.UTF8Encoding($false)))
}

function Valoare($v) {
  if ($null -eq $v) { return $null }
  if ($v -is [DateTime]) { return $v.ToString("yyyy-MM-dd") }
  if ($v -is [double] -or $v -is [int] -or $v -is [decimal] -or $v -is [bool]) { return $v }
  return [string]$v
}

$inainte = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$app = New-Object -ComObject Excel.Application
$dupa = @(Get-Process -Name EXCEL -ErrorAction SilentlyContinue | ForEach-Object { $_.Id })
$pidNou = @($dupa | Where-Object { $inainte -notcontains $_ })
if ($sarcina.pid) { [System.IO.File]::WriteAllText($sarcina.pid, ($pidNou -join ","), (New-Object System.Text.UTF8Encoding($false))) }

try {
  $app.Visible = $false
  $app.DisplayAlerts = $false
  $app.ScreenUpdating = $false
  $app.AskToUpdateLinks = $false
  $app.EnableEvents = $true
  # msoAutomationSecurityLow = 1: macro-urile active doar pe aceasta instanta
  $app.AutomationSecurity = 1

  foreach ($f in $sarcina.fisiere) {
    $rezultat = @{ fisier = $f.cale; ok = $false; eroare = $null; celule = @{}; durataMs = 0 }
    $t0 = Get-Date
    $wb = $null
    try {
      # fisierul e salvat cu fullCalcOnLoad: Excel calculeaza tot la deschidere, in ordinea
      # dependentelor; CalculateFullRebuild NU se foloseste - evalueaza functiile VBA inainte
      # de precedentele lor, iar pretts() scoate atunci un MsgBox ("INTRODUCETI CURSUL VALUTAR")
      # care blocheaza instanta (vazut la proba, T 35)
      $wb = $app.Workbooks.Open($f.cale, 0, $false)
      $app.Calculate()
      $wb.Save()
      $app.Calculate()
      foreach ($c in $sarcina.citiri) {
        $ws = $null
        try { $ws = $wb.Worksheets.Item($c.foaie) } catch { $ws = $null }
        if ($null -eq $ws) { $rezultat.celule["$($c.foaie)!$($c.interval)"] = $null; continue }
        $rng = $ws.Range($c.interval)
        $val = $rng.Value2
        $randuri = @()
        if ($val -is [System.Array]) {
          $nr = $val.GetLength(0); $nc = $val.GetLength(1)
          for ($i = 1; $i -le $nr; $i++) {
            $r = @()
            for ($j = 1; $j -le $nc; $j++) { $r += ,(Valoare $val[$i, $j]) }
            $randuri += ,$r
          }
        } else {
          $randuri += ,@(Valoare $val)
        }
        $rezultat.celule["$($c.foaie)!$($c.interval)"] = $randuri
      }
      $rezultat.ok = $true
    } catch {
      $rezultat.eroare = [string]$_.Exception.Message
    } finally {
      if ($null -ne $wb) { try { $wb.Close($false) } catch {} }
      $rezultat.durataMs = [int]((Get-Date) - $t0).TotalMilliseconds
      Scrie-Json $f.iesire $rezultat
    }
  }
} finally {
  try { $app.Quit() } catch {}
  [void][System.Runtime.InteropServices.Marshal]::ReleaseComObject($app)
  [GC]::Collect(); [GC]::WaitForPendingFinalizers()
  foreach ($p in $pidNou) { try { Stop-Process -Id $p -Force -ErrorAction SilentlyContinue } catch {} }
}
