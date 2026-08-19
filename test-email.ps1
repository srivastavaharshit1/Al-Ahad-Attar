$cred = New-Object System.Management.Automation.PSCredential ("srivastavaharsh248@gmail.com", (ConvertTo-SecureString "yxzqjpkgesadlhmo" -AsPlainText -Force))
try {
    Send-MailMessage -To "srivastavaharsh248@gmail.com" -From "srivastavaharsh248@gmail.com" -Subject "Test" -Body "Test" -SmtpServer "smtp.gmail.com" -Port 587 -UseSsl -Credential $cred
    echo "SUCCESS"
} catch {
    echo "ERROR: $($_.Exception.Message)"
}
