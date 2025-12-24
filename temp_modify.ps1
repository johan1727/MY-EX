 = 'd:\TODO\MY EX\my-ex-coach\mobile-app\app\tools\ex-simulator\import.tsx'
 = Get-Content  -Encoding UTF8
 = @()
 = False
 = False

for ( = 0;  -lt .Count; ++) {
     = []
    
    # Agregar imports después de intelligentTokenSampling
    if ( -match "intelligentTokenSampling" -and -not ) {
         += 
         += "import { generateMasterPrompt } from '../../../lib/masterPromptGenerator';"
         += "import { saveMasterPrompt } from '../../../lib/masterPromptSupabase';"
         = True
        continue
    }
    
    # Agregar Master Prompt generation antes de localStorage.setItem('exSimulator_currentProfile'
    if ( -match "localStorage.setItem\('exSimulator_currentProfile'" -and -not ) {
        # Aquí inserto el código del Master Prompt
         += ""
         += "            // Master Prompt Generation - Added automatically"
         += "            console.log('[MasterPrompt] Starting generation...');"
         += ""
         = True
    }
    
     += 
}

 | Set-Content  -Encoding UTF8
Write-Host "Modificación aplicada" -ForegroundColor Green
