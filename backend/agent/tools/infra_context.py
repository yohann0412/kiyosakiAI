import os

def long_context_for_area(keywords: list[str]) -> str:
    """Scans infra_dossier.md and cb_minutes.md for keywords, returns long-form context."""
    
    context = ""
    for filename in ["infra_dossier.md", "cb_minutes.md"]:
        filepath = f"backend/data/{filename}"
        if not os.path.exists(filepath):
            continue

        with open(filepath, "r") as f:
            content = f.read()

        relevant_snippets = []
        for keyword in keywords:
            if keyword.lower() in content.lower():
                # This is a simple implementation that returns the whole file if a keyword is found.
                # A more advanced implementation could return specific paragraphs or sentences.
                relevant_snippets.append(content)
                break 
        
        if relevant_snippets:
            context += f"## From {filename}:\n\n" + "\n\n".join(relevant_snippets) + "\n\n"

    return context
