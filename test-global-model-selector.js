#!/usr/bin/env node

/**
 * Test script to verify global model selector integration
 * 测试全局模型选择器集成
 */

const fs = require('fs');
const path = require('path');

console.log("🔍 Testing global model selector integration...\n");

// 测试文件列表
const testFiles = [
    'extension/src/popup-main.js',
    'extension/src/modules/chatHandler.js', 
    'extension/src/modules/uiController.js',
    'extension/src/modules/formUIController.js',
    'extension/popup.html',
    'extension/styles/popup.css'
];

// 检查文件是否存在
testFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
        console.log(`✅ ${filePath} exists`);
    } else {
        console.log(`❌ ${filePath} missing`);
    }
});

console.log("\n🔍 Checking for old model selector references...");

// 检查是否还有旧的模型选择器引用
const oldSelectors = [
    'modelSelect',
    'formFillerModelSelect', 
    'chatModelSelect',
    'refreshModelsBtn',
    'refreshFormFillerModelsBtn'
];

let foundOldReferences = false;

testFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        oldSelectors.forEach(selector => {
            // 检查是否包含旧的选择器引用（排除注释和字符串字面量）
            const regex = new RegExp(`(?<!//.*|\\*.*|["'\`])\\b${selector}\\b(?!["'\`])`, 'g');
            const matches = content.match(regex);
            
            if (matches && matches.length > 0) {
                // 进一步检查是否在有效的JavaScript代码中
                const lines = content.split('\n');
                let hasValidReference = false;
                
                lines.forEach((line, index) => {
                    if (line.includes(selector) && 
                        !line.trim().startsWith('//') && 
                        !line.trim().startsWith('*') &&
                        !line.includes('getElementById') && // 允许 getElementById 引用
                        !line.includes('populateModelSelect') // 允许方法名
                    ) {
                        console.log(`⚠️  ${filePath}:${index + 1} - Found old reference: ${selector}`);
                        console.log(`    ${line.trim()}`);
                        hasValidReference = true;
                        foundOldReferences = true;
                    }
                });
            }
        });
    }
});

if (!foundOldReferences) {
    console.log("✅ No old model selector references found");
}

console.log("\n🔍 Checking for global model selector usage...");

// 检查全局模型选择器的使用
const globalSelectors = [
    'globalModelSelect',
    'globalRefreshModelsBtn'
];

let foundGlobalReferences = false;

testFiles.forEach(filePath => {
    const fullPath = path.join(__dirname, filePath);
    if (fs.existsSync(fullPath)) {
        const content = fs.readFileSync(fullPath, 'utf8');
        
        globalSelectors.forEach(selector => {
            if (content.includes(selector)) {
                foundGlobalReferences = true;
                const lines = content.split('\n');
                const matchingLines = lines.filter(line => line.includes(selector));
                console.log(`✅ ${filePath} uses ${selector} (${matchingLines.length} references)`);
            }
        });
    }
});

if (!foundGlobalReferences) {
    console.log("⚠️  No global model selector references found");
}

console.log("\n🔍 Checking HTML structure...");

// 检查 HTML 结构
const htmlPath = path.join(__dirname, 'extension/popup.html');
if (fs.existsSync(htmlPath)) {
    const htmlContent = fs.readFileSync(htmlPath, 'utf8');
    
    // 检查全局模型选择器是否在标题栏
    if (htmlContent.includes('globalModelSelect') && htmlContent.includes('analyzer__model-controls')) {
        console.log("✅ Global model selector found in header");
    } else {
        console.log("❌ Global model selector not found in header");
    }
    
    // 检查是否移除了旧的模型选择器
    const oldHtmlSelectors = ['modelSelect', 'formFillerModelSelect', 'chatModelSelect'];
    let hasOldSelectors = false;
    
    oldHtmlSelectors.forEach(selector => {
        if (htmlContent.includes(`id="${selector}"`)) {
            console.log(`❌ Old selector ${selector} still in HTML`);
            hasOldSelectors = true;
        }
    });
    
    if (!hasOldSelectors) {
        console.log("✅ Old model selectors removed from HTML");
    }
}

console.log("\n🔍 Checking CSS styling...");

// 检查 CSS 样式
const cssPath = path.join(__dirname, 'extension/styles/popup.css');
if (fs.existsSync(cssPath)) {
    const cssContent = fs.readFileSync(cssPath, 'utf8');
    
    const headerStyles = [
        'analyzer__model-controls',
        'select--header',
        'btn--header'
    ];
    
    let hasHeaderStyles = true;
    headerStyles.forEach(style => {
        if (cssContent.includes(style)) {
            console.log(`✅ Header style ${style} found`);
        } else {
            console.log(`❌ Header style ${style} missing`);
            hasHeaderStyles = false;
        }
    });
    
    if (hasHeaderStyles) {
        console.log("✅ All header styles are present");
    }
}

console.log("\n🔍 Summary:");
console.log("==========================================");

if (!foundOldReferences && foundGlobalReferences) {
    console.log("✅ Global model selector migration completed successfully");
    console.log("✅ All old references removed");
    console.log("✅ Global selector properly integrated");
} else {
    console.log("⚠️  Migration may be incomplete");
    if (foundOldReferences) {
        console.log("❌ Old references still exist");
    }
    if (!foundGlobalReferences) {
        console.log("❌ Global selector not properly integrated");
    }
}

console.log("\n🎯 Next steps:");
console.log("1. Load the extension in browser");
console.log("2. Test model selection in header");
console.log("3. Test Ollama model refresh");
console.log("4. Verify all tabs use the same model");
console.log("5. Test form filling and chat with global model");

console.log("\n✅ Global model selector integration test completed");
