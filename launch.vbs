Dim WshShell
Set WshShell = WScript.CreateObject("WScript.Shell")
WshShell.CurrentDirectory = "C:\Users\Allen Lee\Desktop\Finance App"
WshShell.Run """C:\Program Files\nodejs\npm.cmd"" run start", 0, False
Set WshShell = Nothing
