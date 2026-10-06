const fs = require("fs");
const path = require("path");

const files = [
  path.join(__dirname, "frontend/src/components/RepairManagement.tsx"),
  path.join(__dirname, "frontend/src/components/RepairPortal.tsx")
];

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");

  // Global background
  content = content.replace(/background:\s*["']#f8fafc["']/g, 'background: "#020617"');
  
  // Cards and panels
  content = content.replace(/background:\s*["']#fff["']/g, 'background: "rgba(30, 41, 59, 0.6)", backdropFilter: "blur(12px)"');
  
  // Text colors
  content = content.replace(/color:\s*["']#0f172a["']/g, 'color: "#fff"');
  content = content.replace(/color:\s*["']#1e293b["']/g, 'color: "#fff"');
  content = content.replace(/color:\s*["']#334155["']/g, 'color: "#e2e8f0"');
  content = content.replace(/color:\s*["']#475569["']/g, 'color: "#cbd5e1"');
  content = content.replace(/color:\s*["']#64748b["']/g, 'color: "#94a3b8"');
  
  // Borders
  content = content.replace(/border:\s*["']1px solid #e2e8f0["']/g, 'border: "1px solid rgba(255, 255, 255, 0.1)"');
  content = content.replace(/border:\s*["']1px solid #cbd5e1["']/g, 'border: "1px solid rgba(255, 255, 255, 0.2)"');
  content = content.replace(/borderBottom:\s*["']2px solid #e5e7eb["']/g, 'borderBottom: "2px solid rgba(255, 255, 255, 0.1)"');
  content = content.replace(/borderTop:\s*["']1px solid #f1f5f9["']/g, 'borderTop: "1px solid rgba(255, 255, 255, 0.1)"');
  
  // Inputs and backgrounds
  content = content.replace(/background:\s*["']#f1f5f9["']/g, 'background: "rgba(255, 255, 255, 0.05)"');
  
  // Alert panels
  content = content.replace(/background:\s*["']#eff6ff["']/g, 'background: "rgba(59, 130, 246, 0.1)"');
  content = content.replace(/border:\s*["']1px solid #bfdbfe["']/g, 'border: "1px solid rgba(59, 130, 246, 0.2)"');
  content = content.replace(/color:\s*["']#1e3a8a["']/g, 'color: "#bfdbfe"');
  content = content.replace(/color:\s*["']#1e40af["']/g, 'color: "#93c5fd"');
  
  // Modals overlay
  content = content.replace(/background:\s*["']rgba\(0,\s*0,\s*0,\s*0\.5\)["']/g, 'background: "rgba(0, 0, 0, 0.7)", backdropFilter: "blur(4px)"');
  
  fs.writeFileSync(file, content, "utf8");
}
console.log("Theme updated!");
