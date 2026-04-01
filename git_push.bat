@echo off
cd /d d:\Memory-Fragementation

REM Remove existing git history
rmdir /s /q .git

REM Re-init
git init
git remote add origin https://github.com/nitishhansa1/memory-fragmentation-simulator.git

REM === Commit 1: Project setup ===
git add package.json package-lock.json .gitignore vite.config.js
git commit -m "chore: initialize Vite project with Chart.js dependency"

REM === Commit 2: Memory Allocation Engine ===
git add src/engine/MemoryEngine.js
git commit -m "feat: add Memory Allocation Engine with First Fit, Best Fit, and Worst Fit strategies"

REM === Commit 3: Auto Simulator ===
git add src/engine/AutoSimulator.js
git commit -m "feat: add Auto Simulator for random process generation and step-by-step simulation"

REM === Commit 4: Memory Map Visualization ===
git add src/viz/MemoryMap.js
git commit -m "feat: add Memory Map visualization with color-coded segmented bar"

REM === Commit 5: Charts and Analytics ===
git add src/viz/Charts.js
git commit -m "feat: add Chart.js analytics for fragmentation, utilization, and algorithm comparison"

REM === Commit 6: UI Components ===
git add src/ui/Controls.js src/ui/StatsPanel.js
git commit -m "feat: add interactive Controls panel and real-time Statistics dashboard"

REM === Commit 7: Styles, HTML, and main entry point ===
git add src/style.css src/main.js index.html
git commit -m "feat: add dark-mode glassmorphism UI, HTML shell, and wire all modules together"

REM === Add remaining scaffold files ===
git add -A
git commit -m "chore: add remaining project assets and cleanup"

REM Push
git branch -M main
git push -u origin main --force

echo Done! All commits pushed.
