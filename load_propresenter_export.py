import chromadb
from tqdm import tqdm
from uuid import uuid4

INPUT_FILE = './ccc_propresenter_export.txt'


def load_propresenter_export(input_file=INPUT_FILE):
    # Initialize ChromaDB
    client = chromadb.HttpClient()
    
    try:
        collection = client.create_collection("auto-slides")
    except Exception as e:
        if "already exists" in str(e):
            collection = client.get_collection("auto-slides")
        else:
            raise e

    # Load the propresenter export file
    with open(input_file, 'r') as f:
        content = f.read()

    # Split the content into songs
    songs = content.split('Title: ')

    # Split each song into slides
    for song in tqdm(songs):
        sections = song.split('\n\n')
        title = sections[0]
        slides = [s.strip() for s in sections[1:] if len(s.strip())]

        if not slides:
            continue

        # Add slides to ChromaDB
        collection.add(
            documents=slides,
            metadatas=[{"song_title": title} for _ in slides],
            ids=[str(uuid4()) for s in slides]
        )

if __name__ == '__main__':
    load_propresenter_export()
