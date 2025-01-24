# -*- mode: python ; coding: utf-8 -*-

block_cipher = None

a = Analysis(
    ['flask_app.py'],
    pathex=['C:/sathiya-openai/MDA-Audio-Devops'],
    binaries=[],
    datas=[
        ('C:/sathiya-openai/MDA-Audio-Devops/templates', 'templates'),
        ('C:/sathiya-openai/MDA-Audio-Devops/static', 'static'),
        ('"C:\Users\levis\AppData\Local\Programs\Python\Python311\Lib\site-packages\azure\cognitiveservices\speech\Microsoft.CognitiveServices.Speech.core.dll"', 'azure/cognitiveservices/speech')
    ],
    hiddenimports=['azure.cognitiveservices.speech'],
    hookspath=[],
    runtime_hooks=[],
    excludes=[],
    win_no_prefer_redirects=False,
    win_private_assemblies=False,
    cipher=block_cipher,
    noarchive=False,
)

pyz = PYZ(a.pure, a.zipped_data, cipher=block_cipher)

exe = EXE(pyz,
          a.scripts,
          a.binaries,
          a.zipfiles,
          a.datas,
          [],
          name='your_executable_name',
          debug=False,
          bootloader_ignore_signals=False,
          strip=False,
          upx=True,
          console=True )
