import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const envPath = path.join(__dirname, '../../.env');

console.log('📝 Corrigindo DATABASE_URL no .env...\n');

try {
    // Ler o arquivo atual
    let envContent = fs.readFileSync(envPath, 'utf8');

    // Substituir a DATABASE_URL malformada pela correta
    envContent = envContent.replace(
        /DATABASE_URL=postgres:([^/])/g,
        'DATABASE_URL=postgres://postgres:$1'
    );

    // Escrever de volta
    fs.writeFileSync(envPath, envContent, 'utf8');

    console.log('✅ DATABASE_URL corrigida!');
    console.log('  Nova URL: postgres://postgres:a83824408aaed3a038ed@116.203.134.255:5436/alphaview?sslmode=disable\n');
    console.log('⚠️  IMPORTANTE: Reiniciando servidor backend...\n');

} catch (error) {
    console.error('❌ Erro ao corrigir .env:', error.message);
    process.exit(1);
}
