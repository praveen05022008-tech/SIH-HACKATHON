import sys
import os

# Set up paths so backend package can be imported
cur_dir = os.path.dirname(os.path.abspath(__file__))
root_dir = os.path.dirname(cur_dir)

if root_dir not in sys.path:
    sys.path.insert(0, root_dir)

backend_dir = os.path.join(root_dir, "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

app_dir = os.path.join(backend_dir, "app")
if app_dir not in sys.path:
    sys.path.insert(0, app_dir)

# Ensure single unified root environment is loaded
from dotenv import load_dotenv
env_root = os.path.join(root_dir, ".env")
if os.path.exists(env_root):
    load_dotenv(env_root, override=False)

from backend.app.main import app
