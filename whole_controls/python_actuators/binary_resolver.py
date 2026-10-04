import os
import pathlib
import shutil

def resolve_binary(name: str) -> pathlib.Path:
    """Resolves path to native worker binary with env and local search."""
    env_dir = os.environ.get("JARVIS_WORKERS_BIN")
    if env_dir:
        cand = pathlib.Path(env_dir) / name
        if cand.exists():
            return cand
    local_cand = pathlib.Path(__file__).resolve().parent.parent / "native_workers" / "bin" / name
    if local_cand.exists():
        return local_cand
    which = shutil.which(name)
    if which:
        return pathlib.Path(which)
    return local_cand
