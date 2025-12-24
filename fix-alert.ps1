// PowerShell script to fix import.tsx
$file = "d:\TODO\MY EX\my-ex-coach\mobile-app\app\tools\ex-simulator\import.tsx"
$content = Get-Content $file -Raw

# Replace the Alert.alert block with simple alert and setStep
$pattern = [regex]::Escape("console.log('Success! Parsed messages ready. Returning to input screen...');
                        setParsedMessages(finalMessages);
                        
                        // Show alert and reload page to update UI
                        Alert.alert(
                            '✅ Listo!',
                            `") + '.*?' + [regex]::Escape("`,
                            [{ text: 'OK', onPress: () => window.location.reload() }]
                        );")

$replacement = @"
console.log('Success! Parsed messages ready. Showing alert...');
                        setParsedMessages(finalMessages);
                        setStep('upload');
                        
                        // Use native alert instead of React Native Alert
                        setTimeout(() => {
                            if (typeof window !== 'undefined') {
                                window.alert('✅ Listo!\n\n' + finalMessages.length.toLocaleString() + ' mensajes procesados.\n\nAhora ingresa el nombre de tu ex y presiona Analizar.');
                            }
                        }, 100);
"@

$newContent = $content -replace $pattern, $replacement

Set-Content -Path $file -Value $newContent -NoNewline
Write-Host "✅ File updated successfully!"
