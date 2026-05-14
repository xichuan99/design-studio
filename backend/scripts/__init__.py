# Scripts package for backend scripts
def seed():
    """Placeholder to expose seed function as package entry point."""
    from .seed_templates import seed as _seed
    return _seed()
