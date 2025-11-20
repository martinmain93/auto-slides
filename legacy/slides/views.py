from django.views.generic import TemplateView
from django.urls import reverse


class HomePageView(TemplateView):
    template_name = 'home.html'
