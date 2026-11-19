from .config import get_settings
from .seed import seed

if __name__ == "__main__":
    created = seed(get_settings(), force=True)
    print("seed complete" if created else "seed skipped")
