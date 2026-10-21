from pathlib import Path
from zipfile import ZipFile, ZIP_DEFLATED
root=Path(__file__).resolve().parents[1]
files=[root/'README.md',root/'package.json',root/'package-lock.json',root/'test.cjs']
for folder in ['dist','tests','scripts','.github']:
 files.extend(p for p in (root/folder).rglob('*') if p.is_file() and p.name!='source.zip')
with ZipFile(root/'dist/source.zip','w',ZIP_DEFLATED) as bundle:
 for p in sorted(files):bundle.write(p,p.relative_to(root))
print('source.zip packaged; no repository history or uploaded data included')
