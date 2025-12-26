import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../../.env');

console.log('📝 Atualizando arquivo .env...\n');

try {
    // Ler o arquivo atual
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Substituir os valores dos JWT secrets
    envContent = envContent.replace(
        /JWT_SECRET=your-super-secret-jwt-key-change-in-production/g,
        'JWT_SECRET=alphaville-super-secret-jwt-key-2024-change-in-production'
    );

    envContent = envContent.replace(
        /JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production/g,
        'JWT_REFRESH_SECRET=alphaville-super-secret-refresh-key-2024-change-in-production'
    );

    // Escrever de volta
    fs.writeFileSync(envPath, envContent, 'utf8');

    console.log('✅ Arquivo .env atualizado com sucesso!');
    console.log('\n📋 JWT Secrets configurados:');
    console.log('  • JWT_SECRET: alphaville-super-secret-jwt-key-2024...');
    console.log('  • JWT_REFRESH_SECRET: alphaville-super-secret-refresh-key-2024...');
    console.log('\n⚠️  IMPORTANTE: Reinicie o servidor backend (Ctrl+C e npm run dev)\n');

} catch (error) {
    console.error('❌ Erro ao atualizar .env:', error.message);
    process.exit(1);
}
