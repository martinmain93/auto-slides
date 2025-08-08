# chat/consumers.py
from email.mime import audio
import json
import httpx
import chromadb
from asgiref.sync import sync_to_async

from django.http import JsonResponse

from channels.generic.websocket import WebsocketConsumer

client = chromadb.HttpClient()
collection = client.get_collection("auto-slides")


def query_slides(query_texts, n_results=1, song_title=None):
    results = collection.query(
        query_texts=query_texts,
        n_results=n_results,
        where={"song_title": song_title} if song_title else {}
    )
    return results


# async def get_slide(request):
#     try:
#         # async with httpx.AsyncClient() as client:
#         #     response = await client.get('https://api.example.com/data')
#         #     response.raise_for_status()
#         #     data = response.json()
#         data = await query_slides("what a beautiful name", n_results=1)
#     except httpx.HTTPError as e:
#         # Handle the HTTP error
#         return JsonResponse({'error': str(e)}, status=500)

#     # Process the data and return an HTTP response
#     return JsonResponse(data)


class SlideConsumer(WebsocketConsumer):
    def connect(self):
        self.accept()

    def disconnect(self, close_code):
        pass

    def receive(self, text_data):
        data_json = json.loads(text_data)
        input_text = data_json["text"]
        # audio_dat = data_json["audio"]
        # print(len(audio_dat))
        slide = query_slides(input_text, n_results=1)

        self.send(text_data=json.dumps({"slide": slide}))
