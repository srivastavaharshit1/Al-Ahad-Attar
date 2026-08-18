$envFile = ".env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^[^#\s]+=" } | ForEach-Object {
        $name, $value = $_ -split '=', 2
        [Environment]::SetEnvironmentVariable($name.Trim(), $value.Trim())
    }
}
mvn spring-boot:run
