; TeleDrive Desktop Installer Script
; Inno Setup 6.0 or higher required

#define MyAppName "TeleDrive"
#define MyAppVersion "2.0.0"
#define MyAppPublisher "TeleDrive Team"
#define MyAppURL "https://github.com/yourusername/teledrive"
#define MyAppExeName "TeleDrive.exe"

[Setup]
; Basic information
AppId={{8F9A7B2C-3D4E-5F6A-7B8C-9D0E1F2A3B4C}
AppName={#MyAppName}
AppVersion={#MyAppVersion}
AppVerName={#MyAppName} {#MyAppVersion}
AppPublisher={#MyAppPublisher}
AppPublisherURL={#MyAppURL}
AppSupportURL={#MyAppURL}
AppUpdatesURL={#MyAppURL}

; Installation directories
DefaultDirName={autopf}\{#MyAppName}
DefaultGroupName={#MyAppName}
DisableProgramGroupPage=yes

; Output
OutputDir=release
OutputBaseFilename=TeleDrive-Setup-v{#MyAppVersion}
SetupIconFile=icon.ico
UninstallDisplayIcon={app}\{#MyAppExeName}

; Compression
Compression=lzma2/max
SolidCompression=yes

; Privileges
PrivilegesRequired=lowest
PrivilegesRequiredOverridesAllowed=dialog

; UI
WizardStyle=modern
WizardImageFile=compiler:WizModernImage-IS.bmp
WizardSmallImageFile=compiler:WizModernSmallImage-IS.bmp

; Misc
ArchitecturesInstallIn64BitMode=x64

[Languages]
Name: "english"; MessagesFile: "compiler:Default.isl"
Name: "vietnamese"; MessagesFile: "compiler:Languages\Vietnamese.isl"

[Tasks]
Name: "desktopicon"; Description: "{cm:CreateDesktopIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked
Name: "quicklaunchicon"; Description: "{cm:CreateQuickLaunchIcon}"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked; OnlyBelowVersion: 6.1; Check: not IsAdminInstallMode
Name: "startupicon"; Description: "Run at Windows startup"; GroupDescription: "{cm:AdditionalIcons}"; Flags: unchecked

[Files]
Source: "dist\TeleDrive\{#MyAppExeName}"; DestDir: "{app}"; Flags: ignoreversion
Source: "dist\TeleDrive\*"; DestDir: "{app}"; Flags: ignoreversion recursesubdirs createallsubdirs
Source: ".env.example"; DestDir: "{app}"; Flags: ignoreversion
Source: "README.md"; DestDir: "{app}"; Flags: ignoreversion isreadme
Source: "CHANGELOG.md"; DestDir: "{app}"; Flags: ignoreversion

[Icons]
Name: "{group}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"
Name: "{group}\{cm:UninstallProgram,{#MyAppName}}"; Filename: "{uninstallexe}"
Name: "{autodesktop}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: desktopicon
Name: "{userappdata}\Microsoft\Internet Explorer\Quick Launch\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: quicklaunchicon
Name: "{userstartup}\{#MyAppName}"; Filename: "{app}\{#MyAppExeName}"; Tasks: startupicon

[Run]
Filename: "{app}\{#MyAppExeName}"; Description: "{cm:LaunchProgram,{#StringChange(MyAppName, '&', '&&')}}"; Flags: nowait postinstall skipifsilent

[UninstallDelete]
Type: filesandordirs; Name: "{app}\data"
Type: filesandordirs; Name: "{app}\logs"
Type: files; Name: "{app}\*.log"
Type: files; Name: "{app}\*.db"
Type: files; Name: "{app}\*.session"

[Code]
procedure CurStepChanged(CurStep: TSetupStep);
var
  DataDir: String;
begin
  if CurStep = ssPostInstall then
  begin
    // Create data directories
    DataDir := ExpandConstant('{app}\data');
    if not DirExists(DataDir) then
      CreateDir(DataDir);
    if not DirExists(DataDir + '\uploads') then
      CreateDir(DataDir + '\uploads');
    if not DirExists(DataDir + '\temp') then
      CreateDir(DataDir + '\temp');
    if not DirExists(DataDir + '\backups') then
      CreateDir(DataDir + '\backups');
    
    // Create logs directory
    if not DirExists(ExpandConstant('{app}\logs')) then
      CreateDir(ExpandConstant('{app}\logs'));
  end;
end;

function InitializeSetup(): Boolean;
begin
  Result := True;
  // Check if already installed
  if RegKeyExists(HKEY_LOCAL_MACHINE, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting("AppId")}_is1') or
     RegKeyExists(HKEY_CURRENT_USER, 'Software\Microsoft\Windows\CurrentVersion\Uninstall\{#SetupSetting("AppId")}_is1') then
  begin
    if MsgBox('TeleDrive is already installed. Do you want to uninstall the previous version?', mbConfirmation, MB_YESNO) = IDYES then
    begin
      Result := True;
    end
    else
    begin
      Result := False;
    end;
  end;
end;
