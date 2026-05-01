@echo off
echo Setting up Git and pushing to GitHub...
cd /d f:\Medisphere-H

echo.
echo [1/7] Configuring Git credentials...
git config --global user.name "Divo5"
git config --global user.email "anghandivyesh@gmail.com"

echo.
echo [2/7] Initializing Git repository...
git init

echo.
echo [3/7] Adding all files...
git add .

echo.
echo [4/7] Committing changes...
git commit -m "first commit - Medisphere Healthcare Platform"

echo.
echo [5/7] Renaming branch to main...
git branch -M main

echo.
echo [6/7] Adding remote repository...
git remote add origin https://github.com/Divo5/Medisphere---Healthcare-Without-Borders.git

echo.
echo [7/7] Pushing to GitHub...
echo.
echo IMPORTANT: When prompted, use your GitHub Personal Access Token (PAT) as password!
echo If you don't have a PAT, create one at: https://github.com/settings/tokens
echo.
git push -u origin main

echo.
echo Done! Check your GitHub repository.
pause
