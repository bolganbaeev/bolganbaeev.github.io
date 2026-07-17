# Блоктар бөлімі

`Блоктар` беті `blocks-data/catalog.json` файлын оқиды.

Әр пәннің ішінде:

- `id`: ішкі идентификатор
- `title`: экранда көрінетін пән аты
- `topics`: блоктар тізімі

Әр блоктың ішінде:

- `code`: мысалы `Блок 1`
- `title`: блок тақырыбы
- `summary`: қысқаша сипаттама
- `file`: `.docx` файлға апаратын салыстырмалы жол
- `questions` (міндетті емес): сұрақ-жауап карточкалары

`questions` форматы:

```json
[
  {
    "question": "Сұрақ мәтіні",
    "answer": "Жауап мәтіні"
  }
]
```

Мысал құрылым:

```text
blocks-data/
  catalog.json
  docs/
    informatics/
      block-1.docx
    history/
      block-1.docx
    math/
      block-1.docx
```

Маңыздысы:

- Viewer `https://docs.google.com/gview` арқылы ашылады.
- Сондықтан `.docx` файл GitHub Pages сайтында жарияланған болуы керек.
- Локалда iframe ашылмауы мүмкін, бірақ `DOCX жүктеу` және `Жаңа бетте ашу` сілтемелері қалады.
- Қауіпсіздік үшін `file` тек `blocks-data/docs/.../*.docx` жолын қабылдайды.
