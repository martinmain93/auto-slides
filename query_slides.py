import chromadb
client = chromadb.HttpClient()
collection = client.get_collection("auto-slides")


def query_slides(query_texts, n_results=1, song_title=None):
    results = collection.query(
        query_texts=query_texts,
        n_results=n_results,
        **{"song_title": song_title} if song_title else {}
    )
    return results
