"""Hand-checked additions to the 1,128-word list taken from the PDF."""

SHORT = {
    1: "Double-consonant traps", 2: "Silent letters", 3: "Schwa vowels and endings", 4: "Calendar and time",
    5: "University and campus", 6: "Academic subjects", 7: "Housing and property", 8: "Home and appliances",
    9: "Finance and banking", 10: "Jobs and the workplace", 11: "Health and fitness", 12: "Food and farming",
    13: "Nature and weather", 14: "Environment and energy", 15: "Wildlife and biology", 16: "Travel and transport",
    17: "Sport, arts and hobbies", 18: "City and civic life",
}

# Words the PDF prints as one word but that are normally written as two (or are non-standard).
# show = the form the test teaches; alt = other forms accepted; note = shown with the answer.
SHOW = {
    "airconditioner": ("air conditioner", ["air-conditioner"], "Your PDF lists this as one word, but the standard spelling is two words: air conditioner."),
    "boardgame": ("board game", ["board-game"], "Your PDF lists this as one word, but the standard spelling is two words: board game."),
    "bedsheet": ("bed sheet", ["bedsheet", "bed-sheet"], "Usually written as two words: bed sheet. The one-word form is also accepted here."),
}

# British / American (and other accepted) spelling pairs. Keys must be words in the list.
ALT = {
    "aluminium": ["aluminum"], "aluminum": ["aluminium"], "amortisation": ["amortization"], "amphitheatre": ["amphitheater"],
    "anaemia": ["anemia"], "anaesthetic": ["anesthetic"], "appetiser": ["appetizer"], "archaeologist": ["archeologist"],
    "archaeology": ["archeology"], "armoury": ["armory"], "artefact": ["artifact"], "behaviour": ["behavior"],
    "catalogue": ["catalog"], "centre": ["center"], "cheque": ["check"], "chequebook": ["checkbook", "cheque book"],
    "chilli": ["chili"], "civilisation": ["civilization"], "counselling": ["counseling"], "counselor": ["counsellor"],
    "dialogue": ["dialog"], "doughnut": ["donut"], "emphasize": ["emphasise"], "encyclopaedia": ["encyclopedia"],
    "enrolment": ["enrollment"], "palaeontology": ["paleontology"], "pediatrics": ["paediatrics"], "airplane": ["aeroplane"],
    "ambience": ["ambiance"], "advisor": ["adviser"], "decor": ["décor"], "coeducational": ["co-educational"],
    "coordinator": ["co-ordinator"], "checkup": ["check-up"], "byproduct": ["by-product"], "birdwatching": ["bird-watching", "bird watching"],
}

# The five trap families from page 1 of the PDF (plus the memory tip for each).
TRAPS = [
    ("Double or single consonants", "accomodation, proffessor, neccessary, reccomend", "accommodation, professor, necessary, recommend",
     "Accommodation has 2 Cs and 2 Ms. Necessary has 1 Collar (C) and 2 Socks (SS)."),
    ("Silent letters (nm, b, sc, k, w)", "enviroment, goverment, concious, Wenesday, Febuary", "environment, government, conscious, Wednesday, February",
     "Sound out the hidden syllables in your head: en-vi-ron-ment, Wed-nes-day, Feb-ru-ary."),
    ("Unstressed schwa vowels (-ance / -ence)", "maintainance, independant, definately, seperate", "maintenance, independent, definitely, separate",
     "Separate has “a rat” in the middle (sep-a-rat-e). Definite has only i's."),
    ("Vowel switch (ei / ie, noun and verb pairs)", "recieve, wierd, advise (noun), practise (noun)", "receive, weird, advice (noun), practice (noun)",
     "“I before E except after C” holds for receive, ceiling, receipt. Nouns use -ice (advice)."),
    ("UK and US variants", "mixing regional forms", "aluminium / aluminum, catalogue / catalog, centre / center",
     "Both are accepted in IELTS Listening. Pick one standard and stay consistent."),
]

PROTOCOL = [
    ("Dictation", "Say or hear about 40 words a day from one category and write them down without pausing. This trains instant spelling recall while you follow the next sentence of the recording."),
    ("Trap highlighting", "Write each missed word three times, capitalising the silent letters or doubled consonants (a-CC-o-MM-o-dation, Wed-NES-day). This stops you spelling by sound alone when unstressed vowels sound identical."),
    ("Transfer check", "At the end, check singular against plural (-s / -es), uncountable nouns, and British against American consistency. This recovers marks lost to dropped endings and hasty slips."),
]
