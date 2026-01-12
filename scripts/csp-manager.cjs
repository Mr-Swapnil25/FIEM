/**
 * CSP Configuration Management Script
 * 
 * Usage:
 *   node scripts/csp-manager.cjs report   - Switch to report-only mode
 *   node scripts/csp-manager.cjs enforce  - Switch to enforcement mode
 *   node scripts/csp-manager.cjs status   - Check current CSP status
 */

const fs = require('fs');
const path = require('path');

const FIREBASE_JSON_PATH = path.join(__dirname, '..', 'firebase.json');
const CSP_CONFIG_PATH = path.join(__dirname, '..', 'csp-config.json');

// Load configurations
function loadFirebaseConfig() {
  const content = fs.readFileSync(FIREBASE_JSON_PATH, 'utf8');
  return JSON.parse(content);
}

function loadCSPConfig() {
  const content = fs.readFileSync(CSP_CONFIG_PATH, 'utf8');
  return JSON.parse(content);
}

function saveFirebaseConfig(config) {
  fs.writeFileSync(FIREBASE_JSON_PATH, JSON.stringify(config, null, 2));
}

// Build CSP policy string from config
function buildCSPPolicy(cspConfig) {
  const policy = cspConfig.policy;
  const directives = Object.entries(policy)
    .map(([key, value]) => `${key} ${value}`)
    .join('; ');
  return `${directives}; report-uri ${cspConfig.csp.reportUri}`;
}

// Get current CSP mode from firebase.json
function getCurrentMode(firebaseConfig) {
  const headers = firebaseConfig?.hosting?.headers || [];
  const globalHeaders = headers.find(h => h.source === '**');
  
  if (!globalHeaders) return 'none';
  
  const cspHeader = globalHeaders.headers?.find(h => 
    h.key === 'Content-Security-Policy' || 
    h.key === 'Content-Security-Policy-Report-Only'
  );
  
  if (!cspHeader) return 'none';
  
  return cspHeader.key === 'Content-Security-Policy' ? 'enforce' : 'report-only';
}

// Switch CSP mode
function switchCSPMode(mode) {
  const firebaseConfig = loadFirebaseConfig();
  const cspConfig = loadCSPConfig();
  
  const headerKey = mode === 'enforce' 
    ? 'Content-Security-Policy'
    : 'Content-Security-Policy-Report-Only';
  
  const policyValue = buildCSPPolicy(cspConfig);
  
  // Find and update the headers array
  if (!firebaseConfig.hosting) {
    console.error('Error: No hosting configuration found in firebase.json');
    process.exit(1);
  }
  
  const headers = firebaseConfig.hosting.headers || [];
  const globalHeaderIndex = headers.findIndex(h => h.source === '**');
  
  if (globalHeaderIndex === -1) {
    console.error('Error: No global headers found in firebase.json');
    process.exit(1);
  }
  
  // Update CSP header
  const globalHeaders = headers[globalHeaderIndex].headers || [];
  const cspIndex = globalHeaders.findIndex(h => 
    h.key === 'Content-Security-Policy' || 
    h.key === 'Content-Security-Policy-Report-Only'
  );
  
  if (cspIndex === -1) {
    // Add new CSP header
    globalHeaders.push({ key: headerKey, value: policyValue });
  } else {
    // Update existing CSP header
    globalHeaders[cspIndex] = { key: headerKey, value: policyValue };
  }
  
  headers[globalHeaderIndex].headers = globalHeaders;
  firebaseConfig.hosting.headers = headers;
  
  saveFirebaseConfig(firebaseConfig);
  
  return { headerKey, policyValue };
}

// Check enforcement date
function checkEnforcementDate(cspConfig) {
  const enforceAfter = new Date(cspConfig.csp.enforceAfter);
  const now = new Date();
  const daysRemaining = Math.ceil((enforceAfter - now) / (1000 * 60 * 60 * 24));
  
  return {
    enforceAfter,
    now,
    daysRemaining,
    shouldEnforce: now >= enforceAfter
  };
}

// Main CLI
const command = process.argv[2];

switch (command) {
  case 'report':
    console.log('🔄 Switching to CSP Report-Only mode...');
    const reportResult = switchCSPMode('report-only');
    console.log('✅ CSP is now in REPORT-ONLY mode');
    console.log(`   Header: ${reportResult.headerKey}`);
    console.log('\n📋 Next steps:');
    console.log('   1. Run: firebase deploy --only hosting');
    console.log('   2. Monitor CSP violations in Cloud Logging');
    console.log('   3. After 7 days, run: node scripts/csp-manager.cjs enforce');
    break;
    
  case 'enforce':
    const cspConfigEnforce = loadCSPConfig();
    const dateCheck = checkEnforcementDate(cspConfigEnforce);
    
    if (!dateCheck.shouldEnforce) {
      console.log(`⚠️  Warning: CSP enforcement is scheduled for ${dateCheck.enforceAfter.toISOString()}`);
      console.log(`   ${dateCheck.daysRemaining} days remaining in report-only period`);
      console.log('\n   To enforce anyway, use: node scripts/csp-manager.cjs enforce --force');
      
      if (process.argv[3] !== '--force') {
        process.exit(1);
      }
      console.log('\n   --force flag detected, proceeding...');
    }
    
    console.log('🔒 Switching to CSP Enforcement mode...');
    const enforceResult = switchCSPMode('enforce');
    console.log('✅ CSP is now in ENFORCEMENT mode');
    console.log(`   Header: ${enforceResult.headerKey}`);
    console.log('\n⚠️  IMPORTANT:');
    console.log('   1. This will BLOCK resources that violate the policy');
    console.log('   2. Ensure you have monitored report-only mode for violations');
    console.log('   3. Run: firebase deploy --only hosting');
    break;
    
  case 'status':
    const firebaseConfig = loadFirebaseConfig();
    const cspConfig = loadCSPConfig();
    const currentMode = getCurrentMode(firebaseConfig);
    const enforcement = checkEnforcementDate(cspConfig);
    
    console.log('📊 CSP Status Report');
    console.log('====================');
    console.log(`Current Mode: ${currentMode.toUpperCase()}`);
    console.log(`Enforcement Date: ${enforcement.enforceAfter.toISOString()}`);
    
    if (enforcement.shouldEnforce) {
      console.log(`Status: ✅ Ready for enforcement`);
    } else {
      console.log(`Status: ⏳ ${enforcement.daysRemaining} days until enforcement`);
    }
    
    console.log(`\nReport URI: ${cspConfig.csp.reportUri}`);
    console.log('\nPolicy Directives:');
    Object.entries(cspConfig.policy).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
    break;
    
  default:
    console.log('CSP Configuration Manager');
    console.log('=========================');
    console.log('Usage:');
    console.log('  node scripts/csp-manager.cjs report   - Switch to report-only mode');
    console.log('  node scripts/csp-manager.cjs enforce  - Switch to enforcement mode');
    console.log('  node scripts/csp-manager.cjs status   - Check current CSP status');
    break;
}
