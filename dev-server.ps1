# Winziger lokaler Webserver für MY LITTLE JOY.
# Nötig, weil manches (Service Worker, Manifest) unter file:// nicht läuft.
# Start:  powershell -ExecutionPolicy Bypass -File .\dev-server.ps1
# Dann:   http://localhost:8123 im Browser öffnen. Beenden mit Strg+C.

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$prefix = 'http://localhost:8123/'

$l = New-Object System.Net.HttpListener
$l.Prefixes.Add($prefix)
$l.Start()
Write-Host "MY LITTLE JOY laeuft auf $prefix  (Strg+C zum Beenden)"

$mime = @{
  '.html'='text/html; charset=utf-8'
  '.css'='text/css; charset=utf-8'
  '.js'='application/javascript; charset=utf-8'
  '.svg'='image/svg+xml'
  '.json'='application/json; charset=utf-8'
  '.webmanifest'='application/manifest+json'
  '.png'='image/png'
  '.txt'='text/plain; charset=utf-8'
}

while ($l.IsListening) {
  $ctx = $l.GetContext()
  $p = $ctx.Request.Url.LocalPath
  if ($p.EndsWith('/')) { $p = $p + 'index.html' }
  $f = Join-Path $root ($p.TrimStart('/') -replace '/','\')
  if (Test-Path $f -PathType Leaf) {
    $bytes = [IO.File]::ReadAllBytes($f)
    $ext = [IO.Path]::GetExtension($f).ToLower()
    if ($mime.ContainsKey($ext)) { $ctx.Response.ContentType = $mime[$ext] }
    # Beim Entwickeln immer neu laden - sonst siehst du deine Aenderungen nicht.
    # Bewusst 'no-cache' und nicht 'no-store': Chrome lehnt Service-Worker-
    # Skripte ab, die mit no-store ausgeliefert werden.
    $ctx.Response.Headers.Add('Cache-Control','no-cache, max-age=0')
    $ctx.Response.ContentLength64 = $bytes.Length
    $ctx.Response.OutputStream.Write($bytes,0,$bytes.Length)
  } else {
    $ctx.Response.StatusCode = 404
  }
  $ctx.Response.Close()
}
