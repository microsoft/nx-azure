Expand-Archive -Path .\bin\azcopy*.zip -DestinationPath .\bin -Force
Move-Item .\bin\azcopy_*\azcopy.exe .\bin -Force
Remove-Item .\bin\azcopy_* -Force -Recurse
Remove-Item .\bin\azcopy_*.zip -Force -Recurse
