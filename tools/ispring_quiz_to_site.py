#!/usr/bin/env python3
import argparse
import json
import re
import shutil
import zipfile
from pathlib import Path

# Жолдар
ROOT_DIR = Path(__file__).resolve().parents[1]
DEFAULT_DATA_DIR = ROOT_DIR / "test" / "data" / "imported"
DEFAULT_ASSETS_DIR = ROOT_DIR / "test" / "assets" / "quizzes"
DEFAULT_CATALOG_PATH = ROOT_DIR / "test" / "data" / "catalog.json"

SUBJECT_DEFAULTS = {
    "Қазақстан тарихы": 1,
    "Информатика": 166,
}

def slugify(value):
    text = str(value or "").strip().lower()
    text = text.replace("қ", "q").replace("ә", "a").replace("ғ", "g").replace("ң", "n")
    text = text.replace("ө", "o").replace("ұ", "u").replace("ү", "u").replace("һ", "h")
    text = text.replace("і", "i")
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "quiz"

def escape_html(text):
    return str(text or "").replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;").replace('"', "&quot;")

def render_inline(run):
    run_type = run.get("tp")
    if run_type == "text":
        text = escape_html(run.get("t", ""))
        tf = run.get("tf", {}) if isinstance(run.get("tf"), dict) else {}
        if run.get("l") or tf.get("b"): text = f"<strong>{text}</strong>"
        if tf.get("u"): text = f"<u>{text}</u>"
        if tf.get("i"): text = f"<em>{text}</em>"
        return text
    if run_type == "equation":
        return run.get("d", {}).get("m", "") # MathML
    return ""

def rich_text_to_html(block):
    if not block: return ""
    paragraphs = []
    for paragraph in block.get("d", []):
        chunks = paragraph.get("c", []) or []
        rendered = "".join(render_inline(c) for c in chunks).strip()
        if rendered: paragraphs.append(f"<p>{rendered}</p>")
    return "".join(paragraphs)

def convert_quiz(quiz_path, json_output_path):
    with zipfile.ZipFile(quiz_path) as archive:
        document = json.load(archive.open("document.json"))
        metadata = json.load(archive.open("metainfo.json"))
        
        questions = []
        for group in document.get("sl", {}).get("g", []):
            for q in group.get("S", []):
                prompt = rich_text_to_html(q.get("D", {}))
                options = []
                correct_id = ""
                for i, choice in enumerate(q.get("C", {}).get("chs", [])):
                    opt_id = f"opt-{chr(97+i)}"
                    html = rich_text_to_html(choice.get("t", {}))
                    options.append({"id": opt_id, "text": opt_id, "html": html, "useHtml": True})
                    if choice.get("c"): correct_id = opt_id
                
                if prompt and correct_id:
                    questions.append({
                        "question": prompt,
                        "useHtml": True,
                        "options": options,
                        "correct": correct_id,
                        "sectionTitle": group.get("T", "")
                    })

    json_output_path.parent.mkdir(parents=True, exist_ok=True)
    json_output_path.write_text(json.dumps(questions, ensure_ascii=False, indent=2), encoding="utf-8")
    
    # Метадеректерден немесе файл атынан тақырыпты алу
    quiz_title = metadata.get("title") or quiz_path.stem
    return quiz_title, len(questions)

def get_next_test_id(catalog, subject):
    base = SUBJECT_DEFAULTS.get(subject, 300)
    used = {int(item["id"]) for item in catalog if str(item.get("id", "")).isdigit()}
    candidate = base
    while candidate in used: candidate += 1
    return candidate

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("quiz_file")
    parser.add_argument("--subject", default="Информатика")
    parser.add_argument("--test-id", type=int)
    parser.add_argument("--title", help="Тақырыпты қолмен өзгерту")
    args = parser.parse_args()

    quiz_path = Path(args.quiz_file).resolve()
    slug = slugify(quiz_path.stem)
    json_out = DEFAULT_DATA_DIR / f"{slug}.json"

    # Конвертация
    extracted_title, count = convert_quiz(quiz_path, json_out)
    
    # Тақырыпты анықтау: аргументтен немесе файлдан
    final_title = args.title if args.title else extracted_title

    # Каталогты жаңарту
    catalog = []
    if DEFAULT_CATALOG_PATH.exists():
        catalog = json.loads(DEFAULT_CATALOG_PATH.read_text(encoding="utf-8"))

    test_id = args.test_id if args.test_id is not None else get_next_test_id(catalog, args.subject)

    new_entry = {
        "id": test_id,
        "title": final_title, # Мұнда тақырып сақталады
        "subject": args.subject,
        "file": str(json_out.relative_to(ROOT_DIR)).replace("\\", "/"),
        "questionCount": count
    }

    # Дубликаттарды тазалап, жаңасын қосу
    catalog = [i for i in catalog if int(i.get("id", -1)) != test_id]
    catalog.append(new_entry)
    catalog.sort(key=lambda x: int(x["id"]))
    
    DEFAULT_CATALOG_PATH.write_text(json.dumps(catalog, ensure_ascii=False, indent=2), encoding="utf-8")

    print(f"Тақырыбы: {final_title}")
    print(f"ID: {test_id} | Сұрақтар: {count}")

if __name__ == "__main__":
    main()
