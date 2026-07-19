import sys
import os
import json
import re
from docx import Document

def convert_docx_to_anki_json(docx_filename, output_name):
    # Сіз көрсеткен тұрақты сақталатын орын (директория)
    TARGET_DIR = "/home/linx/zarevenge.github.io/blocks-data/anki/history/"
    
    # Файлдың бар-жоғын тексереміз
    if not os.path.exists(docx_filename):
        print(f"Қате: Кіріс файл '{docx_filename}' табылмады!")
        sys.exit(1)

    try:
        doc = Document(docx_filename)
    except Exception as e:
        print(f"Файлды оқу мүмкін болмады: {e}")
        sys.exit(1)

    # Егер пайдаланушы екінші аргументке .json деп жазбаса, өзіміз автоматты түрде жалғаймыз
    if not output_name.lower().endswith('.json'):
        output_name += '.json'

    # Сақталатын толық жолды (путь) құрастырамыз
    # Егер көрсетілген папка жүйеде жоқ болса, оны автоматты түрде жасайды
    try:
        os.makedirs(TARGET_DIR, exist_ok=True)
    except Exception:
        pass
        
    full_output_path = os.path.join(TARGET_DIR, output_name)
    anki_cards = []

    # Құжаттың әрбір жолын оқимыз
    for paragraph in doc.paragraphs:
        line = paragraph.text.strip()

        if not line or ":" not in line:
            continue

        # Жолдың басындағы нөмірлер мен артық таңбаларды тазалаймыз
        clean_line = re.sub(r"^[\s\*\-\+]*\d+[\.\)\s]*", "", line).strip()
        clean_line = re.sub(r"^[\s\*\-\+§]+", "", clean_line).strip()

        if ":" in clean_line:
            front, back = clean_line.split(":", 1)
            front = front.strip()
            back = back.strip()

            if front and back:
                anki_cards.append({
                    "front": front,
                    "back": back
                })

    # Нәтижені сіз көрсеткен арнайы папкаға JSON файлы етіп жазамыз
    try:
        with open(full_output_path, "w", encoding="utf-8") as json_file:
            json.dump(anki_cards, json_file, ensure_ascii=False, indent=4)
        print(f"Дайын! {len(anki_cards)} карточка сәтті жасалды.")
        print(f"Сақталған орны: {full_output_path}")
    except Exception as e:
        print(f"Файлды көрсетілген папкаға сақтау мүмкін болмады: {e}")
        # Егер ол папкаға рұқсат болмаса, резерв ретінде ағымдағы папкаға сақтай салады
        local_path = os.path.basename(full_output_path)
        with open(local_path, "w", encoding="utf-8") as json_file:
            json.dump(anki_cards, json_file, ensure_ascii=False, indent=4)
        print(f"Файл ағымдағы папкаға сақталды: {local_path}")

if __name__ == "__main__":
    # Егер терминалда аргументтер толық жазылмаса, нұсқаулық шығады
    if len(sys.argv) < 3:
        print("Қолдану тәсілі: python list_to_json.py <кіріс_файл.docx> <шығыс_файл_аты>")
        print("Мысалы: python list_to_json.py file.docx history_1916")
        sys.exit(1)

    input_word_file = sys.argv[1]
    output_json_name = sys.argv[2]

    convert_docx_to_anki_json(input_word_file, output_json_name)
