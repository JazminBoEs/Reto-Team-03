import sys
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from main import app


@pytest.fixture
def test_client():
    app.testing = True
    with app.test_client() as client:
        yield client
