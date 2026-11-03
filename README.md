# IELTS Spelling Lab

A typed spelling test for **IELTS Listening**, built on a list of 1,128 common words in 18 categories. You hear each word and **type** it, with no multiple choice. Every mistake is shown, explained, fixed and brought back until it sticks.

**Open it:** https://shuvo4321-ally.github.io/ielts-spelling-practice/

## How it works

1. **Listen and type.** A browser voice says the word and you type it. You can replay it, slow it down or ask for a hint (letter count, then letters one at a time). If sound is not available, the word can flash on screen for a few seconds and then hide.
2. **When you are wrong:**
   - the word you typed is shown against the correct word, with wrong, extra and missing letters marked;
   - a label says what kind of mistake it was (doubled letter, silent letter, ie/ei swap, unstressed vowel, ending such as -ance / -ence, missing, extra or wrong letter) with a tip for that kind;
   - the word is shown with its trap letters highlighted (for example a**DD**re**SS**);
   - then **Fix it**: type it three times. The first copy is with the word visible, the second and third from memory.
3. **Mistakes come back.** A missed word returns a few words later in the same session as a "second chance", is saved in **My mistakes** with every wrong version you typed, and returns in later daily reviews on a schedule (1, 3 and 7 days). A word counts as mastered after three correct recalls.

## Modes

| Mode | What it does |
|---|---|
| **Daily review** | 40 words (or 20 or 60): your mistakes and due words first, then new words. |
| **Exam test** | 40 words, each said once with one replay, no hints and no feedback until the end. Every test is a new set: no word is repeated from an earlier test until all 1,128 have been used (28 full tests), then a new round starts. Results, then the fix drill for what you missed. |
| **Retest my mistakes** | Type again every word you got wrong and have not yet mastered. |
| **Practise by category** | Any of the 18 categories, in 10, 20, 40 or all words; mistakes and new words first, random, or A to Z. |
| **My mistakes** | Every missed word with the wrong versions you typed, and your most common error types. |
| **Rules and tips** | The five trap families and the three-step routine from the PDF, and how the lab applies them. |
| **Word list** | All 1,128 words to search and hear. |

Your progress is saved in this browser only. Nothing is sent anywhere.

## Spellings accepted

British and American spellings are both accepted (for example *aluminium / aluminum, centre / center, behaviour / behavior, counselling / counseling*), because IELTS accepts both. Three entries in the PDF are printed as one word but are normally two, so the lab teaches **air conditioner**, **board game** and **bed sheet**.

## Rebuilding

```bash
cd src
python parse_pdf.py path/to/ielts_listening_1000_spelling_words.pdf   # only if the PDF changes (needs PyMuPDF)
python build.py
```

`build.py` checks that there are exactly 1,128 words, no duplicates, only letters, and that every corrected or alternative spelling refers to a word in the list.

| File | Contents |
|---|---|
| `src/cats.json` | The 1,128 words and the 18 category notes, read from the PDF |
| `src/curated.py` | Short category names, accepted UK/US spellings, the three corrections and the trap table |
| `src/build.py` | Checks the data and writes `index.html` |
| `src/app.js`, `src/style.css` | The test, feedback, fix drill, review schedule and modes |
| `src/parse_pdf.py` | Rebuilds `cats.json` from the PDF |

## Note

The word list and category notes come from the PDF "IELTS Listening Spelling Mastery". IELTS is a registered trademark of the British Council, IDP: IELTS Australia and Cambridge University Press & Assessment, which are not connected with this project.
