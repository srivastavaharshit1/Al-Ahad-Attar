Add-Type -AssemblyName System.Drawing
$img = [System.Drawing.Image]::FromFile('c:\Users\sriva\OneDrive\Desktop\Al Ahad Attars\frontend\public\favicon.jpg')
$img.Save('c:\Users\sriva\OneDrive\Desktop\Al Ahad Attars\frontend\public\favicon.png', [System.Drawing.Imaging.ImageFormat]::Png)
$img.Dispose()
Write-Host "Converted successfully."
