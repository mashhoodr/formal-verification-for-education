import json

def parse_english_reading_progression():
    """
    Extracts the official Reading & Comprehension progression from NCP English PG (1-12)
    across Grades 1, 2, 3, 4, and 5.
    """
    english_strand = {
        "curriculum": "National Curriculum of Pakistan (NCP 2022-23)",
        "subject": "English Language",
        "competency": "Competency B: Reading and Comprehension",
        "standard": "Standard 1 & 2: Word identification, decoding, vocabulary, and comprehension to construct meaning",
        "verticalGrades": {
            "Grade 1": {
                "gradeLevel": 1,
                "slos": [
                    {
                        "sloCode": "E-01-B1-05",
                        "title": "Phonics and decoding CVC and simple words",
                        "text": "Recognise, identify, sound out and read decodable CVC words, short vowels, and common sight words.",
                        "textComplexity": "single_clause_decodable_cvc",
                        "comprehensionLevel": "literal_picture_prompted"
                    },
                    {
                        "sloCode": "E-01-B1-08",
                        "title": "Pre-reading predictions using title and illustrations",
                        "text": "Use prior knowledge and pre-reading strategies to predict a story by looking at the picture(s) and title of the text.",
                        "comprehensionLevel": "picture_title_prediction"
                    }
                ]
            },
            "Grade 2": {
                "gradeLevel": 2,
                "slos": [
                    {
                        "sloCode": "E-02-B1-08",
                        "title": "Predict and locate explicit facts in simple narrative",
                        "text": "Locate key information and identify main characters, settings, and events in simple narrative texts with illustrations.",
                        "textComplexity": "simple_sentences_grade2_fk",
                        "comprehensionLevel": "explicit_factual_retrieval_single_sentence"
                    },
                    {
                        "sloCode": "E-02-B2-03",
                        "title": "Distinguish between fact and opinion in familiar texts",
                        "text": "Distinguish between fact and opinion in simple sentences (for fiction and non-fiction texts).",
                        "comprehensionLevel": "binary_fact_opinion_explicit"
                    }
                ]
            },
            "Grade 3": {
                "gradeLevel": 3,
                "slos": [
                    {
                        "sloCode": "E-03-B2-01",
                        "title": "Identify main idea and supporting details in a single paragraph",
                        "text": "Identify the main idea and key supporting details in a paragraph with an explicit topic sentence.",
                        "textComplexity": "single_paragraph_explicit_topic_sentence",
                        "comprehensionLevel": "explicit_main_idea_and_detail_matching"
                    },
                    {
                        "sloCode": "E-03-B2-03",
                        "title": "Identify story structure and simple cause and effect",
                        "text": "Identify different types of fiction and non-fiction texts, simple cause-and-effect relationships, and make simple predictions.",
                        "comprehensionLevel": "cause_and_effect_adjacent_sentences"
                    }
                ]
            },
            "Grade 4": {
                "gradeLevel": 4,
                "slos": [
                    {
                        "sloCode": "E-04-B2-01",
                        "title": "Determine implied main idea and summarize across paragraphs",
                        "text": "Determine the main idea of a multi-paragraph informational or narrative text when the main idea is implied, and summarize key supporting details.",
                        "textComplexity": "multi_paragraph_implied_topic_sentence",
                        "comprehensionLevel": "implied_main_idea_cross_paragraph_synthesis"
                    },
                    {
                        "sloCode": "E-04-B2-02",
                        "title": "Infer feelings, motives and character traits with textual evidence",
                        "text": "Make simple inferences about characters' feelings, motives, and actions using explicit clues and textual evidence.",
                        "comprehensionLevel": "single_step_inference_with_textual_clue"
                    }
                ]
            },
            "Grade 5": {
                "gradeLevel": 5,
                "slos": [
                    {
                        "sloCode": "E-05-B2-01",
                        "title": "Synthesize themes and compare multiple texts",
                        "text": "Compare and contrast themes, settings, and main ideas across two short texts on the same topic.",
                        "textComplexity": "paired_multi_paragraph_texts",
                        "comprehensionLevel": "comparative_cross_textual_synthesis"
                    },
                    {
                        "sloCode": "E-05-B2-02",
                        "title": "Distinguish between stated evidence and author perspective/bias",
                        "text": "Distinguish between explicit textual facts, inferences, and author's perspective or point of view in informational texts.",
                        "comprehensionLevel": "perspective_and_bias_evaluation"
                    }
                ]
            }
        }
    }

    with open("data/curriculum/pakistan/extracted/english_reading_progression_g1_g5.json", "w", encoding="utf-8") as f:
        json.dump(english_strand, f, indent=2)
    print("Saved data/curriculum/pakistan/extracted/english_reading_progression_g1_g5.json")

if __name__ == "__main__":
    parse_english_reading_progression()
