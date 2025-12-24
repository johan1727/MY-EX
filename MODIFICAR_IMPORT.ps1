# Script para modificar import.tsx automáticamente
# Ejecuta este script en PowerShell

$filePath = "d:\TODO\MY EX\my-ex-coach\mobile-app\app\tools\ex-simulator\import.tsx"

# Leer el archivo
$content = Get-Content $filePath -Raw -Encoding UTF8

# Código a insertar (imports)
$importsToAdd = @"
import { generateMasterPrompt } from '../../../lib/masterPromptGenerator';
import { saveMasterPrompt } from '../../../lib/masterPromptSupabase';
"@

# Verificar si ya están los imports
if ($content -notmatch 'generateMasterPrompt') {
    # Buscar línea después de intelligentTokenSampling
    $content = $content -replace "(import \{ intelligentTokenSampling \} from '../../../lib/messageSampling';)", "`$1`n$importsToAdd"
    Write-Host "✓ Imports agregados" -ForegroundColor Green
} else {
    Write-Host "- Imports ya existen" -ForegroundColor Yellow
}

# Código para Master Prompt generation
$masterPromptCode = @"

            // ========== MASTER PROMPT GENERATION ==========
            console.log('[handleAnalyze] 🧠 Starting Master Prompt generation...');
            
            // Obtener exSenderName
            const senderCounts = new Map();
            parsedMessages.forEach(msg => {
                senderCounts.set(msg.sender, (senderCounts.get(msg.sender) || 0) + 1);
            });

            const exNameLower = exName.toLowerCase().trim();
            const exSenderName = Array.from(senderCounts.keys()).find(name => {
                const nameLower = name.toLowerCase().trim();
                return nameLower === exNameLower ||
                    nameLower.includes(exNameLower) ||
                    exNameLower.includes(nameLower);
            });

            if (exSenderName) {
                try {
                    const masterPromptResult = await generateMasterPrompt(
                        parsedMessages,
                        exSenderName,
                        exName,
                        (progress, status, timeRemaining) => {
                            setProgress(Math.floor(90 + (progress * 0.1)));
                            setProgressStatus(status);
                            console.log(`[MasterPrompt] ${progress}% - ${status}`);
                        }
                    );

                    console.log('[handleAnalyze] ✅ Master Prompt generated:', masterPromptResult.tokenCount, 'tokens');

                    profileData.masterPrompt = masterPromptResult.masterPrompt;
                    profileData.tokenCount = masterPromptResult.tokenCount;
                    profileData.categoriesAnalyzed = masterPromptResult.categoriesAnalyzed;

                    // Guardar en Supabase si hay usuario
                    const { data: { user } } = await supabase.auth.getUser();
                    
                    if (user?.id) {
                        try {
                            const { data: savedProfile } = await supabase
                                .from('ex_profiles')
                                .insert({
                                    user_id: user.id,
                                    ex_name: exName,
                                    profile_data: profile,
                                    message_count: parsedMessages.length
                                })
                                .select('id')
                                .single();

                            if (savedProfile) {
                                profileData.supabaseId = savedProfile.id;

                                await saveMasterPrompt({
                                    exProfileId: savedProfile.id,
                                    masterPrompt: masterPromptResult.masterPrompt,
                                    tokenCount: masterPromptResult.tokenCount,
                                    version: 1,
                                    analysisDurationSeconds: masterPromptResult.analysisDurationSeconds,
                                    categoriesAnalyzed: masterPromptResult.categoriesAnalyzed
                                });

                                console.log('[handleAnalyze] ✅ Saved to Supabase');
                            }
                        } catch (supabaseErr) {
                            console.warn('[handleAnalyze] Supabase save failed:', supabaseErr);
                        }
                    }
                } catch (masterPromptErr) {
                    console.error('[handleAnalyze] Master Prompt error:', masterPromptErr);
                }
            }
            // ========== END MASTER PROMPT ==========

"@

# Verificar si ya existe el código
if ($content -notmatch 'MASTER PROMPT GENERATION') {
    # Insertar ANTES de localStorage.setItem
    $content = $content -replace "(            localStorage\.setItem\('exSimulator_currentProfile')", "$masterPromptCode`$1"
    Write-Host "✓ Master Prompt generation agregado" -ForegroundColor Green
} else {
    Write-Host "- Master Prompt generation ya existe" -ForegroundColor Yellow
}

# Guardar archivo
$content | Set-Content $filePath -Encoding UTF8 -NoNewline

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✅ import.tsx modificado exitosamente!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Ahora puedes probar la app." -ForegroundColor White
