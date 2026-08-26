Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('c:\Users\sriva\OneDrive\Desktop\Al Ahad Attars\frontend\public\favicon.png')
Write-Host "$($img.Width)x$($img.Height)"
