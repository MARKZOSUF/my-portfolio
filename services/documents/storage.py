import os,subprocess
from pathlib import Path
from flask import current_app
from models import Document
from utils.errors import AppError
def scan_file(path):
    scanner=current_app.config.get("MALWARE_SCANNER","noop")
    if scanner=="noop": return
    if scanner!="clamav": raise AppError("SCANNER_CONFIGURATION_ERROR","The malware scanner is misconfigured.",500)
    try: result=subprocess.run([current_app.config["CLAMSCAN_PATH"],"--no-summary",str(path)],capture_output=True,text=True,timeout=60,check=False)
    except (OSError,subprocess.TimeoutExpired) as exc: raise AppError("MALWARE_SCAN_UNAVAILABLE","The upload scanner is unavailable.",503) from exc
    if result.returncode==1: raise AppError("MALWARE_DETECTED","The document failed malware scanning.",422)
    if result.returncode!=0: raise AppError("MALWARE_SCAN_FAILED","The document could not be scanned.",503)
def delete_physical(document):
    path=(Path(current_app.config["UPLOAD_FOLDER"])/Path(document.stored_name).name)
    path.unlink(missing_ok=True)
def cleanup_orphans():
    folder=Path(current_app.config["UPLOAD_FOLDER"]); known={x[0] for x in Document.query.with_entities(Document.stored_name).all()}; removed=0
    for path in folder.iterdir():
        if path.is_file() and path.name not in known: path.unlink(missing_ok=True); removed+=1
    return removed
