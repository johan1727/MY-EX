import re

# Read the file
with open(r'd:\TODO\MY EX\my-ex-coach\mobile-app\app\coach.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Find and replace the AI footer section (lines ~330-382)
new_lines = []
skip_until = -1

for i, line in enumerate(lines):
    line_num = i + 1
    
    # Start of section to replace
    if '{/* AI Label + Report Button' in line:
        # Add new code
        new_lines.append('                                {/* AI Footer - ChatGPT style */}\n')
        new_lines.append('                                {msg.role === \'assistant\' && (\n')
        new_lines.append('                                    <View style={{ flexDirection: \'row\', alignItems: \'center\', marginTop: 6, gap: 6 }}>\n')
        new_lines.append('                                        <Sparkles size={11} color="#6b7280" />\n')
        new_lines.append('                                        <Text style={{ fontSize: 10, color: \'#6b7280\', fontWeight: \'500\' }}>IA</Text>\n')
        new_lines.append('                                        <TouchableOpacity\n')
        new_lines.append('                                            onPress={() => {\n')
        new_lines.append('                                                Alert.alert(\'Opciones\', \'\', [\n')
        new_lines.append('                                                    { text: \'🚩 Reportar contenido inapropiado\', onPress: async () => { await reportAIContent(`coach_msg_${index}`, msg.content, \'coach\', \'current_user_id\'); } },\n')
        new_lines.append('                                                    { text: \'Cancelar\', style: \'cancel\' }\n')
        new_lines.append('                                                ]);\n')
        new_lines.append('                                            }}\n')
        new_lines.append('                                            style={{ marginLeft: \'auto\', padding: 4, opacity: 0.5 }}\n')
        new_lines.append('                                        >\n')
        new_lines.append('                                            <MoreVertical size={14} color="#6b7280" />\n')
        new_lines.append('                                        </TouchableOpacity>\n')
        new_lines.append('                                    </View>\n')
        new_lines.append('                                )}\n')
        # Skip until we find the closing of this section
        skip_until = 1  # We'll count braces
        continue
    
    # Count braces to find end of block
    if skip_until > 0:
        if '{' in line:
            skip_until += line.count('{')
        if '}' in line:
            skip_until -= line.count('}')
        if skip_until == 0 and ')}\n' in line:
            skip_until = -1  # Reset, we're done skipping
        continue
    
    # Add all other lines
    new_lines.append(line)

# Write back
with open(r'd:\TODO\MY EX\my-ex-coach\mobile-app\app\coach.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("✅ coach.tsx updated successfully")
