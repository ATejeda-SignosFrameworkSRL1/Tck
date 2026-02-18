# Script para crear el primer usuario admin
$body = @{
    email = "admin@ticketsystem.com"
    password = "admin123"
    name = "Administrador"
    role = "admin"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3000/auth/register" -Method Post -Body $body -ContentType "application/json"
    Write-Host "✅ Usuario admin creado exitosamente!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Credenciales:" -ForegroundColor Cyan
    Write-Host "Email: admin@ticketsystem.com" -ForegroundColor Yellow
    Write-Host "Password: admin123" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Token JWT:" -ForegroundColor Cyan
    Write-Host $response.access_token
} catch {
    Write-Host "❌ Error al crear usuario:" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
