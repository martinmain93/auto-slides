# chat/routing.py
from django.urls import re_path

from . import consumers

websocket_urlpatterns = [
    re_path(r"ws/slides/$", consumers.SlideConsumer.as_asgi(), name="get_slide")
]
