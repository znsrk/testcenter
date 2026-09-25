# Task reference audit

Inspected all 11 text-readable PDFs in `Tasks/` with `scripts/inspect-pdfs.py` on 2026-09-25. Original PDFs and archives are preserved and ignored by Git. The RAR archives were not needed to inspect the supplied extracted PDFs; no audio from the archives is copied into the app.

| Folder / grade | Observed structure |
| --- | --- |
| Startoviy/Grammar/eng09.pdf | Grammar/vocabulary MCQ, short comprehension extracts; 30 questions with 15×1, 10×2, 5×3 points. |
| Startoviy/Grammar/eng10.pdf | Passive, tenses, conditionals, vocabulary, synonyms, comprehension MCQ; same 50-point weighting. |
| Startoviy/Grammar/eng11.pdf | More advanced vocabulary, phrasal verbs, reported speech, collocations and comprehension MCQ; same weighting. |
| Rayonniy/Grammar/eng09-2.pdf | Articles, tenses, conditionals, passive, reported speech, proverbs and reading MCQ; same weighting. |
| Rayonniy/Grammar/eng10-2.pdf | Connectors, gerunds, comparatives, word formation, idioms, time clauses and reading MCQ. |
| Rayonniy/Grammar/eng11-2.pdf | Modals, relatives, causatives, contrast linkers, vocabulary and longer comprehension MCQ. |
| Oblast / grade 9 / Tour I | Listening TF + MCQ (20 points / 15 min); reading two TF passages (20 / 25 min); 2–3-word transformations + word formation (20 / 20 min); story (40 / 30 min), 150–180 words. |
| Oblast / grade 10 / Tour I | Listening MCQ + TF (20 / 25 min); sentence insertion + MCQ + TF reading (20 / 30 min); word formation + 2–3-word transformations (20 / 25 min); story (40 / 40 min), 180–210 words. |
| Oblast / grade 11 / Tour I | Similar to grade 10, more demanding passages, sentence insertion and TF/MCQ, word formation/transformations; story 210–240 words, 40 points. The header contains conflicting 90/120 minute totals; individual section guidance is used. |
| Respublika / grade 10 / 2025 | Listening: lecture ≤3-word answers + MCQ, five speakers matched to roles and feelings (20 points). Reading: TF/not given, date classification, extract MCQ (20). Grammar: MCQ cloze, verb forms, one word shared by three sentences (20). Writing: articles, report, complaint/application letters, 150–160 words / 40 points. |
| Respublika / grade 11 / 2025 | Same listening layout. Reading: section matching, phrase insertion, literary MCQ. Grammar: one-word open cloze, 3–6-word keyword transformations. Writing: essay, review, proposal, letter, article, 170–180 words / 40 points. |

## Application mapping

Supported objective widgets are multiple choice, true/false (optionally not given), missing-part input and matching (labelled choice options). Word formation, transformations and cloze use the missing-part widget. Section classification and speaker matching use the matching widget. All questions have explicit points and answer explanations.

The generation prompt receives the corresponding structured reference profile, selected class/stage/skill/format, word limits and difficulty. It does not send local PDFs to an external provider. Content is original, not copied from the examples.

No Class 9 national paper was supplied. National Class 9 is explicitly adapted from Class 10. Listening/writing for starting and district rounds, additional formats, and regional non-story writing are labelled adapted practice. Selecting a single format creates focused practice, not a replica of a complete official paper. Grades 9–11 are supported; no evidence for other classes was supplied.

The user-requested 6–8-minute audio is one recording (potentially several speaker turns), with 20-minute suggested task time. It is not a claim about the exact length of the reference recordings.
