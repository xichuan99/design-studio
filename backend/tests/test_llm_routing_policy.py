from pathlib import Path


def test_no_direct_generate_content_calls_outside_llm_client():
    backend_root = Path(__file__).resolve().parents[1]
    offenders = []

    for file_path in backend_root.glob("app/**/*.py"):
        if file_path.name == "llm_client.py":
            continue

        content = file_path.read_text(encoding="utf-8")
        if "models.generate_content(" in content:
            offenders.append(str(file_path.relative_to(backend_root)))

    assert offenders == [], f"Direct generate_content usage found outside llm_client.py: {offenders}"
