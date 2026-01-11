from . import views
from django.urls import path
from django.shortcuts import render
from .views import classify_site

urlpatterns = [
    path("", lambda r: render(r, "camera.html")),
    path("ptz/", views.ptz_control),
    path('camera/connect/', views.connect_camera, name='connect_camera'),
    path("stream/", views.video_stream),
    path("stream2/", views.video_stream2),
    path("camera/screenshot/", views.camera_screenshot, name="camera_screenshot"),
    path("classify/", classify_site),
]