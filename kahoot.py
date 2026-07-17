import json
import random
import pandas as pd
import sys

def generate_kahoot_quiz(json_file, num_questions=30):
    with open(json_file, 'r', encoding='utf-8') as f:
        all_questions = json.load(f)
    
    count = min(num_questions, len(all_questions))
    selected_questions = random.sample(all_questions, count)
    
    # Excel бағандары үшін бос тізімдер дайындаймыз
    questions = []
    ans1, ans2, ans3, ans4 = [], [], [], []
    correct_answers = []

    for q in selected_questions:
        correct_option = q["options"][0] # Бастапқы дұрыс жауапты есте сақтаймыз
        
        # Жауаптар тізімінің көшірмесін алып, оны араластырамыз
        shuffled_options = list(q["options"])
        random.shuffle(shuffled_options) 
        
        # Араласқан тізімнен бастапқы дұрыс жауаптың ЖАҢА ИНДЕКСІН табамыз
        # Kahoot 1-ден бастап санағандықтан, соңына +1 қосамыз
        correct_index = shuffled_options.index(correct_option) + 1
        
        # Мәліметтерді тізімге жинаймыз
        questions.append(q["question"])
        ans1.append(shuffled_options[0])
        ans2.append(shuffled_options[1])
        ans3.append(shuffled_options[2])
        ans4.append(shuffled_options[3])
        correct_answers.append(correct_index)

    # Шаблон құрылымы
    kahoot_data = {
        "Question": questions,
        "Answer 1": ans1,
        "Answer 2": ans2,
        "Answer 3": ans3,
        "Answer 4": ans4,
        "Time limit (sec)": [20] * count,
        "Correct answer": correct_answers  # Енді бұл жерде тек 1 емес, 1, 2, 3, 4 араласып тұрады
    }
    
    df = pd.DataFrame(kahoot_data)
    df.to_excel("kahoot_ready_30.xlsx", index=False)
    print(f"Сәтті аяқталды! {count} сұрақ 'kahoot_ready_30.xlsx' файлына жазылды.")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Қате: JSON файлдың жолын көрсетіңіз!")
        sys.exit(1)
    generate_kahoot_quiz(sys.argv[1], int(sys.argv[2]))
