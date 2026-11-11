# D57: OCR com o leitor nativo do Windows (Windows.Media.Ocr, pt-BR), sem instalar nada.
# Lê todas as imagens .png de uma pasta e grava, ao lado de cada uma, um .json com as linhas
# reconhecidas e suas caixas (x, y, largura, altura em pixels). Uso:
#   powershell -File scripts/ocr_windows.ps1 <pasta>
param([Parameter(Mandatory = $true)][string]$Pasta)
$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Runtime.WindowsRuntime
[void][Windows.Media.Ocr.OcrEngine, Windows.Foundation, ContentType = WindowsRuntime]
[void][Windows.Storage.StorageFile, Windows.Storage, ContentType = WindowsRuntime]
[void][Windows.Graphics.Imaging.BitmapDecoder, Windows.Graphics, ContentType = WindowsRuntime]
[void][Windows.Globalization.Language, Windows.Globalization, ContentType = WindowsRuntime]
$asTask = ([System.WindowsRuntimeSystemExtensions].GetMethods() | Where-Object {
    $_.Name -eq "AsTask" -and $_.GetParameters().Count -eq 1 -and $_.GetParameters()[0].ParameterType.Name -eq "IAsyncOperation``1" })[0]
function Esperar($op, [Type]$tipo) { $t = $asTask.MakeGenericMethod($tipo).Invoke($null, @($op)); $t.Wait(-1) | Out-Null; $t.Result }
$motor = [Windows.Media.Ocr.OcrEngine]::TryCreateFromLanguage([Windows.Globalization.Language]::new("pt-BR"))
Get-ChildItem -LiteralPath $Pasta -Filter *.png | Sort-Object Name | ForEach-Object {
    $saida = [IO.Path]::ChangeExtension($_.FullName, ".json")
    if (Test-Path -LiteralPath $saida) { return }
    $arq = Esperar ([Windows.Storage.StorageFile]::GetFileFromPathAsync($_.FullName)) ([Windows.Storage.StorageFile])
    $fluxo = Esperar ($arq.OpenAsync([Windows.Storage.FileAccessMode]::Read)) ([Windows.Storage.Streams.IRandomAccessStream])
    $dec = Esperar ([Windows.Graphics.Imaging.BitmapDecoder]::CreateAsync($fluxo)) ([Windows.Graphics.Imaging.BitmapDecoder])
    $bmp = Esperar ($dec.GetSoftwareBitmapAsync()) ([Windows.Graphics.Imaging.SoftwareBitmap])
    $res = Esperar ($motor.RecognizeAsync($bmp)) ([Windows.Media.Ocr.OcrResult])
    $linhas = foreach ($l in $res.Lines) {
        $ws = $l.Words
        $x = ($ws | ForEach-Object { $_.BoundingRect.X } | Measure-Object -Minimum).Minimum
        $y = ($ws | ForEach-Object { $_.BoundingRect.Y } | Measure-Object -Minimum).Minimum
        $h = ($ws | ForEach-Object { $_.BoundingRect.Height } | Measure-Object -Maximum).Maximum
        [pscustomobject]@{ texto = $l.Text; x = $x; y = $y; h = $h }
    }
    $fluxo.Dispose()
    ConvertTo-Json -InputObject @($linhas) -Depth 3 | Out-File -LiteralPath $saida -Encoding utf8
}
